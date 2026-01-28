use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use wasmtime::{Config, Engine, Linker, Module, Store, StoreLimitsBuilder, Trap};
use wasmtime_wasi::pipe::{MemoryInputPipe, MemoryOutputPipe};
use wasmtime_wasi::preview1;
use wasmtime_wasi::{DirPerms, FilePerms, I32Exit, WasiCtxBuilder};

use crate::workspace;

pub struct SandboxRunRequest {
    pub wasm_path: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub stdin: Option<String>,
    pub root: PathBuf,
    pub timeout_ms: u64,
    pub memory_limit_bytes: u64,
    pub max_output_bytes: usize,
}

pub struct SandboxRunResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u128,
    pub timed_out: bool,
}

struct SandboxState {
    wasi: preview1::WasiP1Ctx,
    limits: wasmtime::StoreLimits,
}

pub async fn run_wasi(request: SandboxRunRequest) -> Result<SandboxRunResult> {
    tokio::task::spawn_blocking(move || run_wasi_blocking(request))
        .await
        .map_err(|err| anyhow!("Sandbox runner failed: {}", err))?
}

fn run_wasi_blocking(request: SandboxRunRequest) -> Result<SandboxRunResult> {
    let start = Instant::now();

    let root = if request.root.as_os_str().is_empty() {
        PathBuf::from(".")
    } else {
        request.root
    };
    let wasm_path = workspace::resolve_path(&root, Some(&request.wasm_path))?;
    if !wasm_path.exists() {
        return Err(anyhow!("WASM module not found"));
    }

    let mut config = Config::new();
    config.epoch_interruption(true);

    let engine = Engine::new(&config)?;
    let module = Module::from_file(&engine, &wasm_path)?;

    let stdout_pipe = MemoryOutputPipe::new(request.max_output_bytes.max(1));
    let stderr_pipe = MemoryOutputPipe::new(request.max_output_bytes.max(1));
    let stdin_pipe = match request.stdin {
        Some(input) => MemoryInputPipe::new(input.into_bytes()),
        None => MemoryInputPipe::new(Vec::new()),
    };

    let mut args = Vec::with_capacity(request.args.len() + 1);
    args.push("sandbox".to_string());
    args.extend(request.args);

    let mut builder = WasiCtxBuilder::new();
    builder
        .stdin(stdin_pipe)
        .stdout(stdout_pipe.clone())
        .stderr(stderr_pipe.clone())
        .args(&args);

    if !request.env.is_empty() {
        let env_pairs: Vec<(String, String)> = request
            .env
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        builder.envs(&env_pairs);
    }

    builder.preopened_dir(&root, ".", DirPerms::all(), FilePerms::all())?;

    let wasi = builder.build_p1();
    let limits = StoreLimitsBuilder::new()
        .memory_size(request.memory_limit_bytes.try_into().unwrap_or(usize::MAX))
        .table_elements(10_000)
        .build();

    let mut store = Store::new(
        &engine,
        SandboxState {
            wasi,
            limits,
        },
    );
    store.limiter(|state| &mut state.limits);

    let mut linker = Linker::new(&engine);
    preview1::add_to_linker_sync(&mut linker, |state: &mut SandboxState| &mut state.wasi)?;

    let instance = linker.instantiate(&mut store, &module)?;
    let start_func = instance.get_typed_func::<(), ()>(&mut store, "_start")?;

    let timeout_ms = request.timeout_ms.max(1);
    let epoch_interval = Duration::from_millis(10);
    let interval_ms = epoch_interval.as_millis().max(1) as u64;
    let deadline = (timeout_ms / interval_ms).max(1);
    store.set_epoch_deadline(deadline);

    let ticking = Arc::new(AtomicBool::new(true));
    let tick_engine = engine.clone();
    let tick_flag = ticking.clone();
    let tick_thread = std::thread::spawn(move || {
        while tick_flag.load(Ordering::Relaxed) {
            std::thread::sleep(epoch_interval);
            tick_engine.increment_epoch();
        }
    });

    let mut timed_out = false;
    let mut exit_code = 0;
    let run_result = start_func.call(&mut store, ());
    match run_result {
        Ok(()) => {}
        Err(err) => {
            if let Some(exit) = err.downcast_ref::<I32Exit>() {
                exit_code = exit.0 as i32;
            } else if let Some(trap) = err.downcast_ref::<Trap>() {
                if trap.to_string().to_lowercase().contains("interrupt") {
                    timed_out = true;
                    exit_code = 124;
                } else {
                    return Err(anyhow!("WASM trap: {}", trap));
                }
            } else {
                return Err(anyhow!("WASM failed: {}", err));
            }
        }
    }

    ticking.store(false, Ordering::Relaxed);
    let _ = tick_thread.join();

    let duration_ms = start.elapsed().as_millis();

    let stdout = stdout_pipe.contents();
    let stderr = stderr_pipe.contents();

    let stdout = limit_output(&stdout, request.max_output_bytes);
    let stderr = limit_output(&stderr, request.max_output_bytes);

    Ok(SandboxRunResult {
        stdout,
        stderr,
        exit_code,
        duration_ms,
        timed_out,
    })
}

fn limit_output(bytes: &[u8], max_bytes: usize) -> String {
    let slice = if bytes.len() > max_bytes {
        &bytes[..max_bytes]
    } else {
        bytes
    };
    String::from_utf8_lossy(slice).to_string()
}

pub fn validate_root(root: &Path) -> Result<()> {
    if !root.exists() {
        return Err(anyhow!("Workspace root does not exist"));
    }
    Ok(())
}
