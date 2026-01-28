use axum::{Json, http::StatusCode};
use std::path::{PathBuf};
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub name: Option<String>,
    pub preferred_categories: Vec<String>,
    pub experience_level: String, // novice, intermediate, advanced
    pub response_style: String,   // concise, step-by-step
    pub units: String,            // metric, imperial
    pub language: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct ProfileResponse {
    pub exists: bool,
    pub profile: Option<Profile>,
}

#[derive(Debug, Deserialize)]
pub struct ProfileInput {
    pub name: Option<String>,
    pub preferred_categories: Option<Vec<String>>,
    pub experience_level: Option<String>,
    pub response_style: Option<String>,
    pub units: Option<String>,
    pub language: Option<String>,
}

fn get_profile_path() -> PathBuf {
    let mut paths = vec![
        PathBuf::from("data/profile.json"),
        PathBuf::from("../data/profile.json"),
    ];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join("data/profile.json"));
            paths.push(exe_dir.join("../data/profile.json"));
        }
    }

    paths.into_iter()
        .find(|p| p.exists() || p.parent().map(|parent| parent.exists()).unwrap_or(false))
        .unwrap_or_else(|| PathBuf::from("data/profile.json"))
}

pub async fn get_profile() -> (StatusCode, Json<serde_json::Value>) {
    let path = get_profile_path();
    
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
            return (StatusCode::OK, Json(serde_json::json!({
                "exists": true,
                "profile": profile
            })));
        }
    }

    (StatusCode::OK, Json(serde_json::json!({
        "exists": false,
        "profile": null
    })))
}

pub async fn save_profile(Json(input): Json<ProfileInput>) -> (StatusCode, Json<serde_json::Value>) {
    let path = get_profile_path();
    let now = Utc::now().to_rfc3339();

    let mut profile = if let Ok(content) = std::fs::read_to_string(&path) {
        serde_json::from_str::<Profile>(&content).unwrap_or_else(|_| create_default_profile(&now))
    } else {
        create_default_profile(&now)
    };

    // Update fields
    if let Some(name) = input.name { profile.name = Some(name); }
    if let Some(cats) = input.preferred_categories { profile.preferred_categories = cats; }
    if let Some(level) = input.experience_level { profile.experience_level = level; }
    if let Some(style) = input.response_style { profile.response_style = style; }
    if let Some(units) = input.units { profile.units = units; }
    if let Some(lang) = input.language { profile.language = Some(lang); }
    profile.updated_at = now;

    // Ensure data directory exists
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    match serde_json::to_string_pretty(&profile) {
        Ok(json) => {
            if let Err(e) = std::fs::write(&path, json) {
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "success": false,
                    "error": format!("Failed to write profile file: {}", e)
                })));
            }
            (StatusCode::OK, Json(serde_json::json!({
                "success": true,
                "profile": profile
            })))
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
            "success": false,
            "error": format!("Failed to serialize profile: {}", e)
        })))
    }
}

fn create_default_profile(now: &str) -> Profile {
    Profile {
        id: "default".to_string(),
        name: None,
        preferred_categories: vec![],
        experience_level: "novice".to_string(),
        response_style: "concise".to_string(),
        units: "metric".to_string(),
        language: None,
        created_at: now.to_string(),
        updated_at: now.to_string(),
    }
}
