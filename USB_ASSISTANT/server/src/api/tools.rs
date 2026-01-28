use std::collections::HashMap;

use axum::Json;
use serde::{Deserialize, Serialize};

use crate::interpreter::Interpreter;
use crate::sandbox::{self, SandboxRunRequest};
use crate::workspace;

#[derive(Debug, Deserialize)]
pub struct ToolRequest {
    pub tool: String,
    pub path: Option<String>,
    pub command: Option<String>,
    pub cwd: Option<String>,
    pub root: Option<String>,
    pub sandbox_root: Option<String>,
    pub content: Option<String>,
    pub expected_sha256: Option<String>,
    pub wasm_path: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub stdin: Option<String>,
    pub timeout_ms: Option<u64>,
    pub memory_limit_mb: Option<u64>,
    pub max_output_bytes: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct ToolResponse {
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub async fn execute_tool(
    Json(payload): Json<ToolRequest>,
) -> Json<ToolResponse> {
    let root_value = payload
        .root
        .as_deref()
        .or(payload.sandbox_root.as_deref());

    let result = match payload.tool.as_str() {
        "list_dir" => {
            let path = payload.path.as_deref().unwrap_or(".");
            let root = match workspace::resolve_root(root_value) {
                Ok(root) => root,
                Err(err) => {
                    return Json(ToolResponse {
                        success: false,
                        result: None,
                        error: Some(err.to_string()),
                    })
                }
            };
            Interpreter::list_dir(path, &root)
        }
        "read_file" => {
            if let Some(path) = payload.path {
                let root = match workspace::resolve_root(root_value) {
                    Ok(root) => root,
                    Err(err) => {
                        return Json(ToolResponse {
                            success: false,
                            result: None,
                            error: Some(err.to_string()),
                        })
                    }
                };
                Interpreter::read_file(&path, &root)
            } else {
                crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some("Path required for read_file".to_string()),
                }
            }
        }
        "write_file" => {
            if let (Some(path), Some(content)) = (payload.path, payload.content) {
                let root = match workspace::resolve_root(root_value) {
                    Ok(root) => root,
                    Err(err) => {
                        return Json(ToolResponse {
                            success: false,
                            result: None,
                            error: Some(err.to_string()),
                        })
                    }
                };
                Interpreter::write_file(&path, &content, &root)
            } else {
                crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some("Path and content required for write_file".to_string()),
                }
            }
        }
        "edit_file" => {
            if let (Some(path), Some(content)) = (payload.path, payload.content) {
                let root = match workspace::resolve_root(root_value) {
                    Ok(root) => root,
                    Err(err) => {
                        return Json(ToolResponse {
                            success: false,
                            result: None,
                            error: Some(err.to_string()),
                        })
                    }
                };
                Interpreter::edit_file(
                    &path,
                    &content,
                    payload.expected_sha256.as_deref(),
                    &root,
                )
            } else {
                crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some("Path and content required for edit_file".to_string()),
                }
            }
        }
        "delete_file" => {
            if let Some(path) = payload.path {
                let root = match workspace::resolve_root(root_value) {
                    Ok(root) => root,
                    Err(err) => {
                        return Json(ToolResponse {
                            success: false,
                            result: None,
                            error: Some(err.to_string()),
                        })
                    }
                };
                Interpreter::delete_file(&path, &root)
            } else {
                crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some("Path required for delete_file".to_string()),
                }
            }
        }
        "run_command" => {
            if let Some(cmd) = payload.command {
                let root = match workspace::resolve_root(root_value) {
                    Ok(root) => root,
                    Err(err) => {
                        return Json(ToolResponse {
                            success: false,
                            result: None,
                            error: Some(err.to_string()),
                        })
                    }
                };
                Interpreter::run_command(&cmd, &root, payload.cwd.as_deref())
            } else {
                crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some("Command required for run_command".to_string()),
                }
            }
        }
        "run_wasi" => {
            let wasm_path = payload.wasm_path.or(payload.path);
            let Some(wasm_path) = wasm_path else {
                return Json(ToolResponse {
                    success: false,
                    result: None,
                    error: Some("wasm_path is required for run_wasi".to_string()),
                });
            };

            let root = match workspace::resolve_root(root_value) {
                Ok(root) => root,
                Err(err) => {
                    return Json(ToolResponse {
                        success: false,
                        result: None,
                        error: Some(err.to_string()),
                    })
                }
            };
            if let Err(err) = sandbox::validate_root(&root) {
                return Json(ToolResponse {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                });
            }

            let request = SandboxRunRequest {
                wasm_path,
                args: payload.args.unwrap_or_default(),
                env: payload.env.unwrap_or_default(),
                stdin: payload.stdin,
                root,
                timeout_ms: payload.timeout_ms.unwrap_or(5_000),
                memory_limit_bytes: payload.memory_limit_mb.unwrap_or(128) * 1024 * 1024,
                max_output_bytes: payload.max_output_bytes.unwrap_or(200_000),
            };

            match sandbox::run_wasi(request).await {
                Ok(result) => crate::interpreter::ToolResult {
                    success: !result.timed_out && result.exit_code == 0,
                    result: Some(serde_json::json!({
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "exit_code": result.exit_code,
                        "duration_ms": result.duration_ms,
                        "timed_out": result.timed_out
                    })),
                    error: if result.timed_out {
                        Some("Sandbox timeout exceeded".to_string())
                    } else if result.exit_code != 0 {
                        Some(format!("WASM exited with code {}", result.exit_code))
                    } else {
                        None
                    },
                },
                Err(err) => crate::interpreter::ToolResult {
                    success: false,
                    result: None,
                    error: Some(err.to_string()),
                },
            }
        }
        "pick_folder" => crate::interpreter::ToolResult {
            success: false,
            result: None,
            error: Some("Native picker is disabled; enter a folder path manually.".to_string()),
        },
        "pick_file" => crate::interpreter::ToolResult {
            success: false,
            result: None,
            error: Some("Native picker is disabled; enter a file path manually.".to_string()),
        },
        _ => crate::interpreter::ToolResult {
            success: false,
            result: None,
            error: Some("Unknown tool".to_string()),
        },
    };

    Json(ToolResponse {
        success: result.success,
        result: result.result,
        error: result.error,
    })
}
