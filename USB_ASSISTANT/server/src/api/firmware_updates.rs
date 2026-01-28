use axum::{http::StatusCode, Json};
use serde::Deserialize;
use std::path::Path;

use crate::firmware_updates::{apply_firmware_update_pack, load_last_firmware_update};

#[derive(Debug, Deserialize)]
pub struct FirmwareUpdateApplyRequest {
    pub source_path: String,
}

pub async fn firmware_update_status_handler() -> (StatusCode, Json<serde_json::Value>) {
    match load_last_firmware_update() {
        Ok(record) => (StatusCode::OK, Json(serde_json::json!({
            "last_update": record,
        }))),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "error": err.to_string(),
        }))),
    }
}

pub async fn apply_firmware_update_handler(
    Json(payload): Json<FirmwareUpdateApplyRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let source_path = Path::new(&payload.source_path);
    match apply_firmware_update_pack(source_path) {
        Ok(record) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "update": record,
        }))),
        Err(err) => {
            let message = err.to_string();
            let status = if message.starts_with("Validation failed") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(serde_json::json!({
                "success": false,
                "error": message,
            })))
        }
    }
}
