use axum::{extract::Query, Json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::api::system_info::collect_system_info;
use crate::model_index::{load_or_refresh_index, GgufMetadataSummary, ModelIndex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub display_name: String,
    pub filename: String,
    pub min_ram_gb: u32,
    #[serde(default)]
    pub min_vram_gb: Option<u32>,
    pub recommended_ctx: u32,
    #[serde(default)]
    pub notes: String,
    #[serde(default = "default_category")]
    pub category: String,
    #[serde(default)]
    pub uncensored: bool,
    #[serde(default)]
    pub tier: Option<String>,
    #[serde(default)]
    pub available: bool,
    #[serde(default)]
    pub metadata: Option<GgufMetadataSummary>,
    #[serde(default)]
    pub file: Option<ModelFileInfo>,
    #[serde(default)]
    pub compatibility: Option<ModelCompatibility>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelFileInfo {
    pub path: String,
    pub size_bytes: u64,
    pub modified_unix: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCompatibility {
    pub available: bool,
    pub compatible: bool,
    pub ram_ok: bool,
    pub vram_ok: bool,
    pub ctx_ok: bool,
    pub ram_required_gb: u32,
    pub ram_available_gb: f64,
    pub vram_required_gb: Option<u32>,
    pub ctx_required: u32,
    pub ctx_limit: Option<u32>,
    #[serde(default)]
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelIndexStatus {
    pub scanned_at: String,
    pub entries: usize,
    pub refreshed: bool,
}

#[derive(Serialize)]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<ModelIndexStatus>,
}

#[derive(Deserialize)]
pub struct ModelsQuery {
    pub ctx: Option<u32>,
}

pub async fn get_models(Query(query): Query<ModelsQuery>) -> Json<ModelsResponse> {
    Json(build_models_response(false, query.ctx))
}

pub async fn refresh_models(Query(query): Query<ModelsQuery>) -> Json<ModelsResponse> {
    Json(build_models_response(true, query.ctx))
}

fn build_models_response(force_refresh: bool, ctx_override: Option<u32>) -> ModelsResponse {
    let manifest_path = get_manifest_path();
    let mut index_status = None;

    let index = match load_or_refresh_index(force_refresh) {
        Ok(value) => {
            index_status = Some(ModelIndexStatus {
                scanned_at: value.scanned_at.clone(),
                entries: value.entries.len(),
                refreshed: value.updated,
            });
            Some(value)
        }
        Err(err) => {
            tracing::warn!("Failed to load model index: {}", err);
            None
        }
    };

    let system_info = collect_system_info();

    match std::fs::read_to_string(&manifest_path) {
        Ok(content) => match serde_json::from_str::<Vec<ModelInfo>>(&content) {
            Ok(mut models) => {
                for model in &mut models {
                    let resolved_path = resolve_model_path(&model.filename);
                    model.available = resolved_path.exists();

                    if let Some((file_info, metadata)) = lookup_index_entry(&index, &model, &resolved_path) {
                        model.file = Some(file_info);
                        model.metadata = metadata;
                    }

                    let ctx_required = ctx_override.unwrap_or(model.recommended_ctx);
                    model.compatibility = Some(evaluate_compatibility(
                        model,
                        &system_info,
                        ctx_required,
                    ));
                }

                ModelsResponse {
                    models,
                    error: None,
                    index: index_status,
                }
            }
            Err(e) => ModelsResponse {
                models: vec![],
                error: Some(format!("Failed to parse manifest: {}", e)),
                index: index_status,
            },
        },
        Err(e) => ModelsResponse {
            models: vec![],
            error: Some(format!("Failed to read manifest at {:?}: {}", manifest_path, e)),
            index: index_status,
        },
    }
}

fn lookup_index_entry(
    index: &Option<ModelIndex>,
    model: &ModelInfo,
    resolved_path: &PathBuf,
) -> Option<(ModelFileInfo, Option<GgufMetadataSummary>)> {
    let index = index.as_ref()?;
    let mut entry = index.entries.get(&model.filename);
    if entry.is_none() {
        if let Some(name) = resolved_path.file_name().and_then(|n| n.to_str()) {
            entry = index.entries.get(name);
        }
    }

    entry.map(|value| {
        (
            ModelFileInfo {
                path: value.path.clone(),
                size_bytes: value.size_bytes,
                modified_unix: value.modified_unix,
            },
            value.gguf.clone(),
        )
    })
}

pub fn evaluate_compatibility(
    model: &ModelInfo,
    system_info: &crate::api::system_info::SystemInfo,
    ctx_required: u32,
) -> ModelCompatibility {
    let mut reasons = Vec::new();
    let available = model.available;
    if !available {
        reasons.push("Model file missing".to_string());
    }

    let ram_ok = system_info.ram_available_gb >= model.min_ram_gb as f64;
    if !ram_ok {
        reasons.push(format!("Needs {} GB RAM", model.min_ram_gb));
    }

    let vram_ok = match model.min_vram_gb {
        Some(_) => system_info.gpu.is_some(),
        None => true,
    };
    if !vram_ok {
        reasons.push("GPU required".to_string());
    }

    let ctx_limit = model
        .metadata
        .as_ref()
        .and_then(|meta| meta.context_length);
    let ctx_ok = ctx_limit.map(|limit| ctx_required <= limit).unwrap_or(true);
    if !ctx_ok {
        reasons.push("Context exceeds model limit".to_string());
    }

    let compatible = available && ram_ok && vram_ok && ctx_ok;

    ModelCompatibility {
        available,
        compatible,
        ram_ok,
        vram_ok,
        ctx_ok,
        ram_required_gb: model.min_ram_gb,
        ram_available_gb: system_info.ram_available_gb,
        vram_required_gb: model.min_vram_gb,
        ctx_required,
        ctx_limit,
        reasons,
    }
}

pub fn load_manifest_models() -> Vec<ModelInfo> {
    let manifest_path = get_manifest_path();
    match std::fs::read_to_string(&manifest_path) {
        Ok(content) => serde_json::from_str::<Vec<ModelInfo>>(&content).unwrap_or_default(),
        Err(_) => vec![],
    }
}

fn get_manifest_path() -> PathBuf {
    // 1. Try relative to Current Working Directory (Root)
    let cwd_path = PathBuf::from("models/manifest.json");
    if cwd_path.exists() { return cwd_path; }

    // 2. Try sibling to backend folder (if running from /backend)
    let sibling_path = PathBuf::from("../models/manifest.json");
    if sibling_path.exists() { return sibling_path; }

    // 3. Try relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let manifest = exe_dir.join("../models/manifest.json");
            if manifest.exists() { return manifest; }
            let manifest_root = exe_dir.join("models/manifest.json");
            if manifest_root.exists() { return manifest_root; }
        }
    }
    
    PathBuf::from("models/manifest.json")
}

fn get_models_dir() -> PathBuf {
    let cwd_path = PathBuf::from("models");
    if cwd_path.exists() { return cwd_path; }

    let sibling_path = PathBuf::from("../models");
    if sibling_path.exists() { return sibling_path; }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let models_dir = exe_dir.join("../models");
            if models_dir.exists() { return models_dir; }
            let models_root = exe_dir.join("models");
            if models_root.exists() { return models_root; }
        }
    }
    PathBuf::from("models")
}


pub fn get_model_path(filename: &str) -> PathBuf {
    get_models_dir().join(filename)
}

pub fn resolve_model_path(filename: &str) -> PathBuf {
    let direct = get_model_path(filename);
    if direct.exists() {
        return direct;
    }

    if let Some(split) = find_split_model_path(filename) {
        return split;
    }

    direct
}

fn find_split_model_path(filename: &str) -> Option<PathBuf> {
    let name = std::path::Path::new(filename).file_name()?.to_string_lossy();
    let stem = std::path::Path::new(&*name).file_stem()?.to_string_lossy();
    let base = stem.to_ascii_lowercase();
    let models_dir = get_models_dir();
    let mut candidates: Vec<(u32, PathBuf)> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(models_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("gguf")) != Some(true) {
                continue;
            }
            let file_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(value) => value.to_string(),
                None => continue,
            };
            let file_lower = file_name.to_ascii_lowercase();
            let prefix = format!("{}-", base);
            if !file_lower.starts_with(&prefix) {
                continue;
            }
            if !file_lower.ends_with(".gguf") {
                continue;
            }
            let middle = &file_lower[prefix.len()..file_lower.len() - 5];
            let (part, total) = match middle.split_once("-of-") {
                Some(value) => value,
                None => continue,
            };
            if !is_split_digits(part) || !is_split_digits(total) {
                continue;
            }
            if let Ok(index) = part.parse::<u32>() {
                candidates.push((index, path));
            }
        }
    }

    candidates.sort_by_key(|(index, _)| *index);
    candidates.first().map(|(_, path)| path.clone())
}

fn is_split_digits(value: &str) -> bool {
    value.len() == 5 && value.chars().all(|c| c.is_ascii_digit())
}

fn default_category() -> String {
    "general".to_string()
}
