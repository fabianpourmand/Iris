use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::SharedLlmManager;
use super::models::{load_manifest_models, resolve_model_path, ModelCompatibility};
use crate::api::system_info::collect_system_info;
use crate::model_index::load_or_refresh_index;

#[derive(Deserialize)]
pub struct StartLlmRequest {
    pub model_id: String,
    pub ctx: Option<u32>,
    pub threads: Option<u32>,
    pub gpu_layers: Option<u32>,
    #[serde(default)]
    pub force_reload: bool,
}

#[derive(Serialize)]
pub struct LlmResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize)]
pub struct LlmStatusResponse {
    pub running: bool,
    pub model_id: Option<String>,
    pub port: u16,
}

#[derive(Deserialize)]
pub struct PreflightLlmRequest {
    pub model_id: String,
    pub ctx: Option<u32>,
    #[allow(dead_code)]
    pub threads: Option<u32>,
    #[allow(dead_code)]
    pub gpu_layers: Option<u32>,
}

#[derive(Serialize)]
pub struct HotSwapStatus {
    pub running: bool,
    pub current_model_id: Option<String>,
    pub target_model_id: String,
    pub requires_swap: bool,
    pub can_swap: bool,
    pub reason: Option<String>,
}

#[derive(Serialize)]
pub struct PreflightLlmResponse {
    pub compatible: bool,
    pub message: String,
    pub compatibility: ModelCompatibility,
    pub hot_swap: HotSwapStatus,
}

pub async fn start_llm(
    State(manager): State<SharedLlmManager>,
    Json(req): Json<StartLlmRequest>,
) -> Json<LlmResponse> {
    let mut manager = manager.lock().await;

    let (model, compatibility) = match preflight_internal(&req.model_id, req.ctx) {
        Ok(value) => value,
        Err(message) => {
            return Json(LlmResponse {
                success: false,
                message,
            });
        }
    };

    if !compatibility.compatible {
        return Json(LlmResponse {
            success: false,
            message: compatibility
                .reasons
                .first()
                .cloned()
                .unwrap_or_else(|| "Model not compatible".to_string()),
        });
    }

    if manager.is_running() && manager.current_model_id() == Some(req.model_id.clone()) && !req.force_reload {
        return Json(LlmResponse {
            success: true,
            message: format!("Model '{}' already running", req.model_id),
        });
    }

    let model_path = resolve_model_path(&model.filename);
    if !model_path.exists() {
        return Json(LlmResponse {
            success: false,
            message: format!("Model file not found: {:?}", model_path),
        });
    }

    let ctx = req.ctx.unwrap_or(model.recommended_ctx);
    let threads = req.threads.unwrap_or(4);

    match manager.start(
        model_path.to_string_lossy().to_string(),
        req.model_id.clone(),
        ctx,
        threads,
        req.gpu_layers,
    ) {
        Ok(_) => Json(LlmResponse {
            success: true,
            message: format!("Started model '{}' with ctx={}, threads={}", req.model_id, ctx, threads),
        }),
        Err(e) => Json(LlmResponse {
            success: false,
            message: format!("Failed to start LLM: {}", e),
        }),
    }
}

pub async fn preflight_llm(
    State(manager): State<SharedLlmManager>,
    Json(req): Json<PreflightLlmRequest>,
) -> Json<PreflightLlmResponse> {
    let manager = manager.lock().await;
    let (model, compatibility) = match preflight_internal(&req.model_id, req.ctx) {
        Ok(value) => value,
        Err(message) => {
            return Json(PreflightLlmResponse {
                compatible: false,
                message,
                compatibility: ModelCompatibility {
                    available: false,
                    compatible: false,
                    ram_ok: false,
                    vram_ok: false,
                    ctx_ok: false,
                    ram_required_gb: 0,
                    ram_available_gb: 0.0,
                    vram_required_gb: None,
                    ctx_required: req.ctx.unwrap_or(0),
                    ctx_limit: None,
                    reasons: vec!["Model not found".to_string()],
                },
                hot_swap: HotSwapStatus {
                    running: manager.is_running(),
                    current_model_id: manager.current_model_id(),
                    target_model_id: req.model_id.clone(),
                    requires_swap: false,
                    can_swap: false,
                    reason: Some("Model not found".to_string()),
                },
            });
        }
    };

    let requires_swap = manager.is_running() && manager.current_model_id() != Some(model.id.clone());
    let can_swap = compatibility.compatible;
    let reason = if !can_swap {
        Some(
            compatibility
                .reasons
                .first()
                .cloned()
                .unwrap_or_else(|| "Model not compatible".to_string()),
        )
    } else if requires_swap {
        Some("Hot swap will stop the current model".to_string())
    } else {
        None
    };

    Json(PreflightLlmResponse {
        compatible: compatibility.compatible,
        message: if compatibility.compatible {
            "Model is compatible".to_string()
        } else {
            reason.clone().unwrap_or_else(|| "Model not compatible".to_string())
        },
        compatibility,
        hot_swap: HotSwapStatus {
            running: manager.is_running(),
            current_model_id: manager.current_model_id(),
            target_model_id: model.id,
            requires_swap,
            can_swap,
            reason,
        },
    })
}

pub async fn stop_llm(
    State(manager): State<SharedLlmManager>,
) -> Json<LlmResponse> {
    let mut manager = manager.lock().await;

    match manager.stop() {
        Ok(_) => Json(LlmResponse {
            success: true,
            message: "LLM stopped".to_string(),
        }),
        Err(e) => Json(LlmResponse {
            success: false,
            message: format!("Failed to stop LLM: {}", e),
        }),
    }
}

pub async fn llm_status(
    State(manager): State<SharedLlmManager>,
) -> Json<LlmStatusResponse> {
    let manager = manager.lock().await;

    Json(LlmStatusResponse {
        running: manager.is_running(),
        model_id: manager.current_model_id(),
        port: 7778,
    })
}

fn preflight_internal(
    model_id: &str,
    ctx_override: Option<u32>,
) -> Result<(super::models::ModelInfo, ModelCompatibility), String> {
    let models = load_manifest_models();
    let model = match models.into_iter().find(|m| m.id == model_id) {
        Some(m) => m,
        None => return Err(format!("Model '{}' not found in manifest", model_id)),
    };

    let index = load_or_refresh_index(false).ok();
    let resolved_path = resolve_model_path(&model.filename);
    let mut model = model;
    model.available = resolved_path.exists();

    if let Some(index) = index.as_ref() {
        if let Some(entry) = index.entries.get(&model.filename) {
            model.metadata = entry.gguf.clone();
        } else if let Some(name) = resolved_path.file_name().and_then(|n| n.to_str()) {
            if let Some(entry) = index.entries.get(name) {
                model.metadata = entry.gguf.clone();
            }
        }
    }

    let system_info = collect_system_info();
    let ctx_required = ctx_override.unwrap_or(model.recommended_ctx);
    let compatibility = super::models::evaluate_compatibility(&model, &system_info, ctx_required);

    Ok((model, compatibility))
}
