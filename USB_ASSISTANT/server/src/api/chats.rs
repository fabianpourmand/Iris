use axum::{extract::{Path}, Json};
use axum::http::StatusCode;
use std::path::{Path as StdPath, PathBuf};
use serde::{Deserialize, Serialize};
use crate::api::chat::{ChatMessage as ChatMsg};
use chrono::Utc;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<ChatMsg>,
    pub category_lock: Option<String>,
    pub model_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatSummary {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: usize,
    pub category_lock: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChatInput {
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChatInput {
    pub title: Option<String>,
    pub category_lock: Option<String>,
}

fn get_chats_dir() -> PathBuf {
    let mut paths = vec![
        PathBuf::from("data/chats"),
        PathBuf::from("../data/chats"),
    ];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join("data/chats"));
            paths.push(exe_dir.join("../data/chats"));
        }
    }

    paths.into_iter()
        .find(|p| p.exists() || p.parent().map(|parent| parent.exists()).unwrap_or(false))
        .unwrap_or_else(|| PathBuf::from("data/chats"))
}

pub async fn list_chats() -> (StatusCode, Json<serde_json::Value>) {
    let dir = get_chats_dir();
    let mut summaries = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(chat) = serde_json::from_str::<ChatSession>(&content) {
                        summaries.push(ChatSummary {
                            id: chat.id,
                            title: chat.title,
                            created_at: chat.created_at,
                            updated_at: chat.updated_at,
                            message_count: chat.messages.len(),
                            category_lock: chat.category_lock,
                        });
                    }
                }
            }
        }
    }

    summaries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    (StatusCode::OK, Json(serde_json::json!({ "chats": summaries })))
}

pub async fn create_chat(Json(input): Json<CreateChatInput>) -> (StatusCode, Json<serde_json::Value>) {
    let dir = get_chats_dir();
    let _ = fs::create_dir_all(&dir);

    let id = format!("chat_{}_{}", Utc::now().timestamp(), uuid::Uuid::new_v4().simple());
    let now = Utc::now().to_rfc3339();
    
    let chat = ChatSession {
        id: id.clone(),
        title: input.title.unwrap_or_else(|| "New Chat".to_string()),
        created_at: now.clone(),
        updated_at: now,
        messages: Vec::new(),
        category_lock: None,
        model_id: None,
    };

    let path = dir.join(format!("{}.json", id));
    match serde_json::to_string_pretty(&chat) {
        Ok(json) => {
            if fs::write(path, json).is_ok() {
                (StatusCode::CREATED, Json(serde_json::json!({ "chat": chat })))
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Failed to write chat file" })))
            }
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Failed to serialize chat" })))
    }
}

pub async fn get_chat(Path(id): Path<String>) -> (StatusCode, Json<serde_json::Value>) {
    let path = get_chats_dir().join(format!("{}.json", id));
    
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(chat) = serde_json::from_str::<ChatSession>(&content) {
            return (StatusCode::OK, Json(serde_json::json!({ "chat": chat })));
        }
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Chat not found" })))
}

pub async fn update_chat(Path(id): Path<String>, Json(input): Json<UpdateChatInput>) -> (StatusCode, Json<serde_json::Value>) {
    let path = get_chats_dir().join(format!("{}.json", id));
    
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(mut chat) = serde_json::from_str::<ChatSession>(&content) {
            if let Some(title) = input.title { chat.title = title; }
            if let Some(lock) = input.category_lock { chat.category_lock = Some(lock); }
            chat.updated_at = Utc::now().to_rfc3339();

            if let Ok(json) = serde_json::to_string_pretty(&chat) {
                if fs::write(path, json).is_ok() {
                    return (StatusCode::OK, Json(serde_json::json!({ "chat": chat })));
                }
            }
        }
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Chat not found" })))
}

pub async fn delete_chat(Path(id): Path<String>) -> (StatusCode, Json<serde_json::Value>) {
    let path = get_chats_dir().join(format!("{}.json", id));
    if StdPath::new(&path).exists() {
        if fs::remove_file(path).is_ok() {
            return (StatusCode::OK, Json(serde_json::json!({ "success": true })));
        }
    }
    (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Chat not found" })))
}
