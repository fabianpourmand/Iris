use axum::Json;
use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct SystemInfo {
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub ram_total_gb: f64,
    pub ram_available_gb: f64,
    pub os: String,
    pub arch: String,
    pub gpu: Option<String>,
}

pub async fn get_system_info() -> Json<SystemInfo> {
    Json(collect_system_info())
}

pub fn collect_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let cpu_cores = sys.cpus().len();
    let ram_total_gb = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let ram_available_gb = sys.available_memory() as f64 / (1024.0 * 1024.0 * 1024.0);

    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    // GPU detection (basic - could be enhanced with platform-specific methods)
    let gpu = detect_gpu();

    SystemInfo {
        cpu_name,
        cpu_cores,
        ram_total_gb: (ram_total_gb * 100.0).round() / 100.0,
        ram_available_gb: (ram_available_gb * 100.0).round() / 100.0,
        os,
        arch,
        gpu,
    }
}

fn detect_gpu() -> Option<String> {
    // Try to detect GPU via environment or common methods
    // This is a simplified detection - could be enhanced per platform
    
    #[cfg(target_os = "linux")]
    {
        // Try lspci for GPU detection
        if let Ok(output) = std::process::Command::new("lspci")
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("VGA") || line.contains("3D") || line.contains("Display") {
                    // Extract GPU name
                    if let Some(idx) = line.find(':') {
                        let gpu_part = line[idx + 1..].trim();
                        if let Some(idx2) = gpu_part.find(':') {
                            return Some(gpu_part[idx2 + 1..].trim().to_string());
                        }
                        return Some(gpu_part.to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, try system_profiler
        if let Ok(output) = std::process::Command::new("system_profiler")
            .args(["SPDisplaysDataType", "-json"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(displays) = json.get("SPDisplaysDataType") {
                    if let Some(arr) = displays.as_array() {
                        if let Some(first) = arr.first() {
                            if let Some(name) = first.get("sppci_model") {
                                return name.as_str().map(|s| s.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, try wmic
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["path", "win32_VideoController", "get", "name"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().skip(1) {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    None
}
