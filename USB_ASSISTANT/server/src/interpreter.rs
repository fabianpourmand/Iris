use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::process::Command;

use serde::{Deserialize, Serialize};
use sha2::Digest;

use crate::workspace;

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub struct Interpreter;

impl Interpreter {
    pub fn list_dir(path: &str, root: &Path) -> ToolResult {
        let target = match workspace::resolve_path(root, Some(path)) {
            Ok(path) => path,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        let mut entries = Vec::new();
        let read_dir = match fs::read_dir(&target) {
            Ok(read_dir) => read_dir,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        for entry in read_dir.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                entries.push(name.to_string());
            }
        }
        entries.sort();

        ToolResult {
            success: true,
            result: Some(serde_json::to_value(entries).unwrap()),
            error: None,
        }
    }

    pub fn read_file(path: &str, root: &Path) -> ToolResult {
        let target = match workspace::resolve_path(root, Some(path)) {
            Ok(path) => path,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        let handle = match File::open(&target) {
            Ok(handle) => handle,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        let mut buffer = Vec::new();
        let max_bytes = 200_000usize;
        if let Err(err) = handle.take((max_bytes + 1) as u64).read_to_end(&mut buffer) {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }
        if buffer.len() > max_bytes {
            return ToolResult {
                success: false,
                result: None,
                error: Some("File too large".to_string()),
            };
        }

        let content = String::from_utf8_lossy(&buffer).to_string();
        ToolResult {
            success: true,
            result: Some(serde_json::json!({ "content": content })),
            error: None,
        }
    }

    pub fn write_file(path: &str, content: &str, root: &Path) -> ToolResult {
        let target = match workspace::resolve_path(root, Some(path)) {
            Ok(path) => path,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        if let Some(parent) = target.parent() {
            if let Err(err) = fs::create_dir_all(parent) {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                };
            }
        }

        let filename = target
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("file");
        let temp_name = format!(".{}.tmp-{}", filename, uuid::Uuid::new_v4());
        let temp_path = target
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(temp_name);

        let mut handle = match File::create(&temp_path) {
            Ok(handle) => handle,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        if let Err(err) = handle.write_all(content.as_bytes()) {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }
        if let Err(err) = handle.flush() {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }
        if let Err(err) = handle.sync_all() {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }
        if let Err(err) = fs::rename(&temp_path, &target) {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }

        ToolResult {
            success: true,
            result: Some(serde_json::json!({
                "path": target.display().to_string(),
                "bytes": content.as_bytes().len()
            })),
            error: None,
        }
    }

    pub fn edit_file(
        path: &str,
        content: &str,
        expected_sha256: Option<&str>,
        root: &Path,
    ) -> ToolResult {
        if let Some(expected) = expected_sha256 {
            let current = match Self::read_file(path, root) {
                ToolResult {
                    success: true,
                    result: Some(value),
                    ..
                } => value
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                ToolResult { error, .. } => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error,
                    }
                }
            };

            let digest = sha2::Sha256::digest(current.as_bytes());
            let actual = format!("{:x}", digest);
            if actual != expected {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some("File changed since last read".to_string()),
                };
            }
        }

        Self::write_file(path, content, root)
    }

    pub fn delete_file(path: &str, root: &Path) -> ToolResult {
        let target = match workspace::resolve_path(root, Some(path)) {
            Ok(path) => path,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };

        if let Err(err) = fs::remove_file(&target) {
            return ToolResult {
                success: false,
                result: None,
                error: Some(err.to_string()),
            };
        }

        ToolResult {
            success: true,
            result: Some(serde_json::json!({ "path": target.display().to_string() })),
            error: None,
        }
    }

    pub fn run_command(command_str: &str, root: &Path, cwd: Option<&str>) -> ToolResult {
        const TOOL_ALLOWLIST: [&str; 8] = [
            "python3", "pytest", "npm", "node", "tsc", "eslint", "vite", "pip",
        ];

        let parts = match shell_words::split(command_str) {
            Ok(parts) => parts,
            Err(err) => {
                return ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                }
            }
        };
        let Some(command) = parts.first() else {
            return ToolResult {
                success: false,
                result: None,
                error: Some("Empty command".to_string()),
            };
        };
        if !TOOL_ALLOWLIST.contains(&command.as_str()) {
            return ToolResult {
                success: false,
                result: None,
                error: Some("Command not allowed".to_string()),
            };
        }

        let mut cmd = Command::new(command);
        if parts.len() > 1 {
            cmd.args(&parts[1..]);
        }

        if let Some(cwd_value) = cwd {
            match workspace::resolve_path(root, Some(cwd_value)) {
                Ok(dir) => {
                    cmd.current_dir(dir);
                }
                Err(err) => {
                    return ToolResult {
                        success: false,
                        result: None,
                        error: Some(err.to_string()),
                    }
                }
            }
        } else {
            cmd.current_dir(root);
        }

        let output = cmd.output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();

                if out.status.success() {
                    ToolResult {
                        success: true,
                        result: Some(serde_json::json!({
                            "returncode": out.status.code().unwrap_or(0),
                            "stdout": stdout,
                            "stderr": stderr
                        })),
                        error: None,
                    }
                } else {
                    ToolResult {
                        success: false,
                        result: Some(serde_json::json!({
                            "returncode": out.status.code().unwrap_or(1),
                            "stdout": stdout,
                            "stderr": stderr
                        })),
                        error: Some(stderr),
                    }
                }
            }
            Err(e) => ToolResult {
                success: false,
                result: None,
                error: Some(e.to_string()),
            },
        }
    }
}
