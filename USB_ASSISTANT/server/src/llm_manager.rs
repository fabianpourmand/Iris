use anyhow::{anyhow, Result};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command};

pub struct LlmManager {
    process: Option<Child>,
    current_model_id: Option<String>,
}

impl LlmManager {
    pub fn new() -> Self {
        Self {
            process: None,
            current_model_id: None,
        }
    }

    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }

    pub fn current_model_id(&self) -> Option<String> {
        self.current_model_id.clone()
    }

    pub fn start(
        &mut self,
        model_path: String,
        model_id: String,
        ctx_size: u32,
        threads: u32,
        gpu_layers: Option<u32>,
    ) -> Result<()> {
        // Stop any existing process first
        self.stop()?;

        // Find llama-server binary
        let llama_server = find_llama_server()?;

        tracing::info!("Starting llama-server: {:?}", llama_server);
        tracing::info!("Model path: {}", model_path);

        // Build command
        let mut cmd = Command::new(&llama_server);
        cmd.arg("--model")
            .arg(&model_path)
            .arg("--host")
            .arg("127.0.0.1")
            .arg("--port")
            .arg("7778")
            .arg("--ctx-size")
            .arg(ctx_size.to_string())
            .arg("--threads")
            .arg(threads.to_string());

        if let Some(layers) = gpu_layers {
            if layers > 0 {
                cmd.arg("--n-gpu-layers").arg(layers.to_string());
            }
        }

        let log_path = get_llama_log_path();
        let mut log_file = match OpenOptions::new().create(true).append(true).open(&log_path) {
            Ok(file) => Some(file),
            Err(err) => {
                tracing::warn!("Failed to open llama-server log at {:?}: {}", log_path, err);
                None
            }
        };

        if let Some(ref mut file) = log_file {
            let _ = writeln!(
                file,
                "\n[{}] Starting model {} with ctx={}, threads={}\n",
                chrono::Utc::now().to_rfc3339(),
                model_id,
                ctx_size,
                threads
            );
        }

        if let Some(file) = log_file {
            let stderr_file = file.try_clone()?;
            cmd.stdout(std::process::Stdio::from(file))
                .stderr(std::process::Stdio::from(stderr_file));
        } else {
            cmd.stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null());
        }

        let mut child = cmd.spawn()?;

        tracing::info!(
            "llama-server started successfully (PID: {:?}). Waiting for port 7778...",
            child.id()
        );

        let target_port = 7778;
        if wait_for_port(target_port, 30) {
            self.process = Some(child);
            self.current_model_id = Some(model_id);
            tracing::info!("llama-server is ready for inference.");
            Ok(())
        } else {
            tracing::error!("llama-server failed to become ready within timeout.");
            let _ = child.kill();
            Err(anyhow!(
                "llama-server failed to start listening on port {} within 30s",
                target_port
            ))
        }
    }

    pub fn stop(&mut self) -> Result<()> {
        if let Some(mut child) = self.process.take() {
            tracing::info!("Stopping llama-server...");

            // Try graceful termination first (Unix only)
            #[cfg(unix)]
            {
                // Send SIGTERM
                unsafe {
                    libc::kill(child.id() as i32, libc::SIGTERM);
                }
                // Wait a bit for graceful shutdown
                std::thread::sleep(std::time::Duration::from_millis(500));
            }

            // Force kill if still running
            let _ = child.kill();
            let _ = child.wait();

            self.current_model_id = None;
            tracing::info!("llama-server stopped");
        }
        Ok(())
    }
}

impl Drop for LlmManager {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

fn find_llama_server() -> Result<PathBuf> {
    let platform = get_platform_string();
    let binary_name = if cfg!(windows) {
        "llama-server.exe"
    } else {
        "llama-server"
    };

    let mut candidates = vec![
        PathBuf::from("runtime").join(&platform).join(binary_name),
        PathBuf::from("../runtime")
            .join(&platform)
            .join(binary_name),
    ];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("runtime").join(&platform).join(binary_name));
            candidates.push(exe_dir.join("../runtime").join(&platform).join(binary_name));
        }
    }

    for path in candidates {
        if path.exists() {
            return Ok(path);
        }
    }

    // Try system PATH as fallback
    if let Ok(output) = Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg("llama-server")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or_default()
                .trim()
                .to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(anyhow!(
        "llama-server binary not found. Tested multiple locations for {} platform.",
        platform
    ))
}

fn get_data_dir() -> PathBuf {
    let mut candidates = vec![PathBuf::from("data"), PathBuf::from("../data")];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("data"));
            candidates.push(exe_dir.join("../data"));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("data"))
}

fn get_llama_log_path() -> PathBuf {
    let data_dir = get_data_dir();
    let log_dir = data_dir.join("logs");
    if let Err(err) = std::fs::create_dir_all(&log_dir) {
        tracing::warn!("Failed to create log directory {:?}: {}", log_dir, err);
    }
    log_dir.join("llama-server.log")
}

fn get_platform_string() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("windows", "x86_64") => "win-x64".to_string(),
        ("windows", "aarch64") => "win-arm64".to_string(),
        ("macos", "x86_64") => "mac-x64".to_string(),
        ("macos", "aarch64") => "mac-arm64".to_string(),
        ("linux", "x86_64") => "linux-x64".to_string(),
        ("linux", "aarch64") => "linux-arm64".to_string(),
        _ => format!("{}-{}", os, arch),
    }
}

fn wait_for_port(port: u16, timeout_secs: u64) -> bool {
    use std::net::TcpStream;
    use std::time::{Duration, Instant};

    let addr = format!("127.0.0.1:{}", port);
    let start = Instant::now();
    let timeout = Duration::from_secs(timeout_secs);

    while start.elapsed() < timeout {
        if TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_millis(500)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(1000));
    }
    false
}
