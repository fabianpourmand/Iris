use axum::{http::StatusCode, Json};
use serde::Deserialize;

use crate::language_packs::{
    activate_language_pack, install_language_pack, list_language_packs, remove_language_pack,
};

#[derive(Debug, Deserialize)]
pub struct LanguagePackInstallRequest {
    pub source_path: String,
}

#[derive(Debug, Deserialize)]
pub struct LanguagePackRemoveRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct LanguagePackActivateRequest {
    pub id: Option<String>,
}

pub async fn list_language_packs_handler() -> (StatusCode, Json<serde_json::Value>) {
    match list_language_packs(false) {
        Ok(list) => (StatusCode::OK, Json(serde_json::json!({
            "active_id": list.active_id,
            "packs": list.packs,
        }))),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": err.to_string(),
        }))),
    }
}

pub async fn install_language_pack_handler(
    Json(payload): Json<LanguagePackInstallRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let source_path = std::path::Path::new(&payload.source_path);
    match install_language_pack(source_path) {
        Ok(pack) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "pack": pack,
        }))),
        Err(err) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "success": false,
            "error": err.to_string(),
        }))),
    }
}

pub async fn remove_language_pack_handler(
    Json(payload): Json<LanguagePackRemoveRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match remove_language_pack(&payload.id) {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
        }))),
        Err(err) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "success": false,
            "error": err.to_string(),
        }))),
    }
}

pub async fn activate_language_pack_handler(
    Json(payload): Json<LanguagePackActivateRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match activate_language_pack(payload.id.as_deref()) {
        Ok(active) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "active_id": active.active_id,
        }))),
        Err(err) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "success": false,
            "error": err.to_string(),
        }))),
    }
}
