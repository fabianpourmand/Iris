use axum::{extract::State, Json};
use chrono::Utc;
use serde::Serialize;
use std::path::PathBuf;
use sysinfo::System;

use crate::api::models::{load_manifest_models, resolve_model_path};
use crate::api::system_info::{collect_system_info, SystemInfo};
use crate::SharedLlmManager;

#[derive(Serialize)]
pub struct DiagnosticsResponse {
    pub status: String,
    pub server: ServerDiagnostics,
    pub system: SystemInfo,
    pub llm: LlmDiagnostics,
    pub models: ModelsDiagnostics,
    pub paths: Vec<PathDiagnostics>,
}

#[derive(Serialize)]
pub struct ServerDiagnostics {
    pub version: String,
    pub pid: u32,
    pub uptime_seconds: u64,
    pub time_utc: String,
}

#[derive(Serialize)]
pub struct LlmDiagnostics {
    pub running: bool,
    pub model_id: Option<String>,
    pub port: u16,
}

#[derive(Serialize)]
pub struct ModelsDiagnostics {
    pub manifest_total: usize,
    pub available: usize,
}

#[derive(Serialize)]
pub struct PathDiagnostics {
    pub name: String,
    pub path: String,
    pub exists: bool,
}

pub async fn get_diagnostics(State(manager): State<SharedLlmManager>) -> Json<DiagnosticsResponse> {
    let manager = manager.lock().await;
    let system = collect_system_info();
    let uptime_seconds = System::uptime();

    let models = load_manifest_models();
    let mut available = 0;
    for model in &models {
        if resolve_model_path(&model.filename).exists() {
            available += 1;
        }
    }

    let paths = vec![
        build_path_diagnostics("models", resolve_models_dir()),
        build_path_diagnostics("data", resolve_data_dir()),
        build_path_diagnostics("runtime", resolve_runtime_dir()),
        build_path_diagnostics("static", resolve_static_dir()),
    ];

    Json(DiagnosticsResponse {
        status: "ok".to_string(),
        server: ServerDiagnostics {
            version: env!("CARGO_PKG_VERSION").to_string(),
            pid: std::process::id(),
            uptime_seconds,
            time_utc: Utc::now().to_rfc3339(),
        },
        system,
        llm: LlmDiagnostics {
            running: manager.is_running(),
            model_id: manager.current_model_id(),
            port: 7778,
        },
        models: ModelsDiagnostics {
            manifest_total: models.len(),
            available,
        },
        paths,
    })
}

fn build_path_diagnostics(name: &str, path: PathBuf) -> PathDiagnostics {
    PathDiagnostics {
        name: name.to_string(),
        path: path.to_string_lossy().to_string(),
        exists: path.exists(),
    }
}

fn resolve_models_dir() -> PathBuf {
    let cwd_path = PathBuf::from("models");
    if cwd_path.exists() {
        return cwd_path;
    }

    let sibling_path = PathBuf::from("../models");
    if sibling_path.exists() {
        return sibling_path;
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let models_dir = exe_dir.join("../models");
            if models_dir.exists() {
                return models_dir;
            }
            let models_root = exe_dir.join("models");
            if models_root.exists() {
                return models_root;
            }
        }
    }

    PathBuf::from("models")
}

fn resolve_data_dir() -> PathBuf {
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

fn resolve_runtime_dir() -> PathBuf {
    let mut candidates = vec![PathBuf::from("runtime"), PathBuf::from("../runtime")];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("runtime"));
            candidates.push(exe_dir.join("../runtime"));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("runtime"))
}

fn resolve_static_dir() -> PathBuf {
    let mut candidates = vec![PathBuf::from("static"), PathBuf::from("../static")];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("static"));
            candidates.push(exe_dir.join("../static"));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("static"))
}
