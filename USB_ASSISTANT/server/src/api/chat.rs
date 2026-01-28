use axum::{extract::State, Json, http::StatusCode};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use axum::response::sse::{Event, Sse};
use std::convert::Infallible;
use tokio_stream::iter;

use crate::SharedLlmManager;

fn strip_references(content: String) -> String {
    let mut output: Vec<String> = Vec::new();
    let mut urls: Vec<String> = Vec::new();
    let mut in_refs = false;

    for raw_line in content.lines() {
        let line = raw_line.trim();
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("references") || lower.starts_with("sources") || lower.starts_with("citations") {
            in_refs = true;
            continue;
        }
        if in_refs {
            if let Some(url) = extract_url(line) {
                urls.push(url.to_string());
            }
            continue;
        }
        if let Some(url) = extract_url(line) {
            urls.push(url.to_string());
            continue;
        }
        output.push(line.to_string());
    }

    let mut cleaned = output.join("\n").trim().to_string();
    if !urls.is_empty() {
        if !cleaned.is_empty() {
            cleaned.push_str("\n\n");
        }
        cleaned.push_str("Sources: ");
        cleaned.push_str(&urls.join(" "));
    }
    cleaned
}

fn extract_url(line: &str) -> Option<&str> {
    let start = line.find("http")?;
    let url = &line[start..];
    let url = url.trim_end_matches(|c: char| c == ')' || c == ']' || c == '.' || c == ',');
    if url.starts_with("http://") || url.starts_with("https://") {
        Some(url)
    } else {
        None
    }
}

fn get_system_prompt(category: &str, model_id: Option<&str>) -> String {
    let base = "You are IRIS (Integrated Resource & Intelligence System), a portable offline AI running locally. Reply in 1-3 concise sentences unless the user asks for details. Avoid lists unless requested. Do not include references or citations unless explicitly asked. ";
    let prompt = match category {
        "survival" => format!("{}Your specialty is SURVIVAL and BUSHCRAFT. Provide practical, high-stakes outdoors advice. Focus on safety, shelter, water, and food extraction.", base),
        "building" => format!("{}Your specialty is CONSTRUCTION and REPAIR. Provide technical, structural advice. Focus on materials, safety codes, and DIY techniques.", base),
        "coding" => format!("{}Your specialty is SOFTWARE ENGINEERING. Provide concise, bug-free code. Focus on performance, security, and clean logic.", base),
        "medical" => format!("{}Your specialty is FIRST AID and MEDICINE. Provide immediate, accurate medical guidance. ALWAYS include safety disclaimers and recommend professional help.", base),
        "planting" => format!("{}Your specialty is AGRICULTURE and BOTANY. Provide advice on growing food, soil health, and seasonal planting.", base),
        "mathematics" => format!("{}Your specialty is MATHEMATICS. Break down complex calculations step-by-step.", base),
        "chemistry" => format!("{}Your specialty is CHEMISTRY. Explain reactions, formulas, and safety protocols clearly.", base),
        _ => "You are IRIS (Integrated Resource & Intelligence System), a portable offline AI that runs locally from a USB drive. Your specialty is practical, actionable help across survival, building and repair, planting and food production, medical first aid, coding and technical troubleshooting, math, chemistry, and general knowledge. Reply in 1-3 concise sentences unless asked for more. Ask clarifying questions only when needed.".to_string(),
    };

    match model_id {
        Some(id) => format!("{} Current model id: {}.", prompt, id),
        None => prompt,
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub category: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub chat_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct LlamaResponse {
    choices: Vec<LlamaChoice>,
    usage: Option<LlamaUsage>,
}

#[derive(Debug, Deserialize)]
struct LlamaChoice {
    message: LlamaMessage,
}

#[derive(Debug, Deserialize)]
struct LlamaMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct LlamaUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
pub struct SpecializedSection {
    #[allow(dead_code)]
    pub id: String,
    pub keywords: Vec<String>,
    pub content: Option<String>,
    pub urgent_content: Option<String>,
    pub primitive_content: Option<String>,
    pub wet_content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SpecializedContent {
    pub survival: Vec<SpecializedSection>,
    pub building: Vec<SpecializedSection>,
    pub coding: Vec<SpecializedSection>,
    pub medical: Vec<SpecializedSection>,
    pub planting: Vec<SpecializedSection>,
}

fn find_specialized_response(category: &str, message: &str, content: &SpecializedContent) -> Option<String> {
    let msg_lower = message.to_lowercase();
    let is_urgent = msg_lower.contains("urgent") || msg_lower.contains("emergency") || msg_lower.contains("quick") || msg_lower.contains("now") || msg_lower.contains("help");
    let is_primitive = msg_lower.contains("primitive") || msg_lower.contains("no tools");
    let is_wet = msg_lower.contains("wet") || msg_lower.contains("rain");

    let check_section = |cat: &str, section: &SpecializedSection| -> Option<String> {
        if section.keywords.iter().any(|kw| msg_lower.contains(kw)) {
            if cat == "survival" {
                if is_urgent && section.urgent_content.is_some() {
                    return section.urgent_content.clone();
                }
                if is_wet && section.wet_content.is_some() {
                    return section.wet_content.clone();
                }
            } else if cat == "building" {
                if is_primitive && section.primitive_content.is_some() {
                    return section.primitive_content.clone();
                }
            }
            return section.content.clone();
        }
        None
    };

    if category == "general" {
        // Check all categories
        for section in &content.survival { if let Some(r) = check_section("survival", section) { return Some(r); } }
        for section in &content.building { if let Some(r) = check_section("building", section) { return Some(r); } }
        for section in &content.coding { if let Some(r) = check_section("coding", section) { return Some(r); } }
        for section in &content.medical { if let Some(r) = check_section("medical", section) { return Some(r); } }
        for section in &content.planting { if let Some(r) = check_section("planting", section) { return Some(r); } }
    } else {
        let sections = match category {
            "survival" => &content.survival,
            "building" => &content.building,
            "coding" => &content.coding,
            "medical" => &content.medical,
            "planting" => &content.planting,
            _ => return None,
        };

        for section in sections {
            if let Some(r) = check_section(category, section) { return Some(r); }
        }
    }
    None
}

pub async fn chat(
    State(manager): State<SharedLlmManager>,
    Json(req): Json<ChatRequest>,
) -> (StatusCode, Json<ChatResponse>) {
    let last_msg = req.messages.last().map(|m| m.content.as_str()).unwrap_or("");
    let category = req.category.as_deref().unwrap_or("general");

    let (llm_running, current_model_id) = {
        let mgr = manager.lock().await;
        (mgr.is_running(), mgr.current_model_id())
    };

    let msg_lower = last_msg.to_ascii_lowercase();
    let is_model_query = msg_lower.contains("what model")
        || msg_lower.contains("which model")
        || msg_lower.contains("model are you running")
        || msg_lower.contains("model is running")
        || msg_lower.contains("current model");

    let is_identity_query = msg_lower.contains("who are you")
        || msg_lower.contains("what are you")
        || msg_lower.contains("your specialty")
        || msg_lower.contains("what is your specialty")
        || msg_lower.contains("what can you do")
        || msg_lower.contains("what do you do")
        || msg_lower.contains("capabilities")
        || msg_lower.contains("what are your capabilities");

    if is_model_query {
        let response = match current_model_id.clone() {
            Some(id) => format!("Current model: {}.", id),
            None => "No model is currently running.".to_string(),
        };
        return (StatusCode::OK, Json(ChatResponse {
            success: true,
            content: Some(response),
            error: None,
            usage: None,
        }));
    }

    if is_identity_query {
        let model_label = current_model_id.clone().unwrap_or_else(|| "unknown".to_string());
        let greeting = match get_profile_name() {
            Some(name) => format!("Hello {}, ", name),
            None => "Hello, ".to_string(),
        };
        let response = format!(
            "{}I am IRIS, your Integrated Resource & Intelligence System, running {}. I provide focused, practical guidance across survival, building, medical, coding, math, chemistry, and general knowledge, tuned for {} support.",
            greeting,
            model_label,
            category
        );
        return (StatusCode::OK, Json(ChatResponse {
            success: true,
            content: Some(response),
            error: None,
            usage: None,
        }));
    }

    // 4. Robust path resolution for specialized_content.json
    let content_path = {
        let mut paths = vec![
            PathBuf::from("data/specialized_content.json"),
            PathBuf::from("../data/specialized_content.json"),
        ];

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                paths.push(exe_dir.join("data/specialized_content.json"));
                paths.push(exe_dir.join("../data/specialized_content.json"));
            }
        }

        paths.into_iter().find(|p: &PathBuf| p.exists()).unwrap_or_else(|| PathBuf::from("data/specialized_content.json"))
    };

    tracing::info!("Loading specialized content from: {:?}", content_path);

    if let Ok(content_str) = std::fs::read_to_string(&content_path) {
        if let Ok(specialized) = serde_json::from_str::<SpecializedContent>(&content_str) {
            tracing::info!("Checking specialized response for category: {}, msg: {}", category, last_msg);
            if let Some(resp) = find_specialized_response(category, last_msg, &specialized) {
                tracing::info!("Found specialized response!");
                return (StatusCode::OK, Json(ChatResponse {
                    success: true,
                    content: Some(resp),
                    error: None,
                    usage: None,
                }));
            }
        } else {
            tracing::error!("Failed to parse specialized content JSON");
        }
    } else {
        tracing::error!("Failed to read specialized content file at {:?}", content_path);
    }

    // Check if LLM is running
    let current_model_id = if llm_running {
        current_model_id
    } else {
        return (StatusCode::SERVICE_UNAVAILABLE, Json(ChatResponse {
            success: false,
            content: None,
            error: Some("LLM is not running for general queries. Please start a model first.".to_string()),
            usage: None,
        }));
    };

    // Multi-Agent / Model Optimization Check
    // If user is asking for a specific category but the current model isn't optimal, 
    // we can either auto-switch (if allowed) or provide a specialized prompt.
    // For now, we'll append a "Model Optimization" note to the usage or content if a better match exists.
    let mut optimization_note = None;
    if let Some(model_id) = current_model_id.as_deref() {
        // Logic to check if model_id matches category would go here
        // For simplicity, we'll just check if category is "coding" but model is "tiny"
        if category == "coding" && model_id.contains("tiny") {
            optimization_note = Some("PRO TIP: Switch to a 'Coder' model in Settings for better technical accuracy.".to_string());
        } else if category == "medical" && !model_id.contains("med") {
             optimization_note = Some("PRO TIP: A specialized 'Medicine' model is recommended for clinical queries.".to_string());
        }
    }

    // Build request to llama-server
    let mut messages = Vec::with_capacity(req.messages.len() + 1);
    messages.push(serde_json::json!({
        "role": "system",
        "content": get_system_prompt(category, current_model_id.as_deref()),
    }));
    messages.extend(req.messages.iter().map(|m| serde_json::json!({
        "role": m.role,
        "content": m.content
    })));

    let llama_request = serde_json::json!({
        "model": "local",
        "messages": messages,
        "temperature": req.temperature.unwrap_or(0.7),
        "max_tokens": req.max_tokens.unwrap_or(512),
        "stream": false
    });

    let client = reqwest::Client::new();
    let response = client
        .post("http://127.0.0.1:7778/v1/chat/completions")
        .json(&llama_request)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<LlamaResponse>().await {
                    Ok(llama_resp) => {
                        let mut content = llama_resp.choices
                            .first()
                            .map(|c| c.message.content.clone())
                            .map(|c| c.replace("<|im_end|>", "").replace("<|im_start|>", "").trim().to_string())
                            .map(strip_references);
                        
                        // Append optimization note if present
                        if let Some(note) = optimization_note {
                            if let Some(ref mut c) = content {
                                *c = format!("{}\n\n---\n💡 {}", c, note);
                            }
                        }
                        
                        let usage = llama_resp.usage.map(|u| UsageInfo {
                            prompt_tokens: u.prompt_tokens,
                            completion_tokens: u.completion_tokens,
                            total_tokens: u.total_tokens,
                        });


                        // 5. Persistence: Save messages to chat session if chat_id provided
                        if let Some(ref cid) = req.chat_id {
                            if let Some(ref c) = content {
                                let mut full_history = req.messages.clone();
                                full_history.push(ChatMessage {
                                    role: "assistant".to_string(),
                                    content: c.clone(),
                                });
                                // We call update_chat logic or just write to file directly for speed
                                // Let's use a helper to find chat path (reuse logic from chats.rs)
                                let chat_path = {
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
                                    let dir = paths.into_iter()
                                        .find(|p| p.exists())
                                        .unwrap_or_else(|| PathBuf::from("data/chats"));
                                    dir.join(format!("{}.json", cid))
                                };

                                if let Ok(existing_content) = std::fs::read_to_string(&chat_path) {
                                    if let Ok(mut session) = serde_json::from_str::<crate::api::chats::ChatSession>(&existing_content) {
                                        session.messages = full_history;
                                        session.updated_at = chrono::Utc::now().to_rfc3339();
                                        if let Ok(updated_json) = serde_json::to_string_pretty(&session) {
                                            let _ = std::fs::write(chat_path, updated_json);
                                        }
                                    }
                                }
                            }
                        }

                        (StatusCode::OK, Json(ChatResponse {
                            success: true,
                            content,
                            error: None,
                            usage,
                        }))
                    }
                    Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(ChatResponse {
                        success: false,
                        content: None,
                        error: Some(format!("Failed to parse LLM response: {}", e)),
                        usage: None,
                    })),
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                (StatusCode::INTERNAL_SERVER_ERROR, Json(ChatResponse {
                    success: false,
                    content: None,
                    error: Some(format!("LLM returned error: {}", error_text)),
                    usage: None,
                }))
            }
        }
        Err(e) => (StatusCode::SERVICE_UNAVAILABLE, Json(ChatResponse {
            success: false,
            content: None,
            error: Some(format!("Failed to connect to LLM: {}", e)),
            usage: None,
        })),
    }
}

pub async fn chat_stream(
    State(manager): State<SharedLlmManager>,
    Json(req): Json<ChatRequest>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    let manager = manager.clone();
    let (status, Json(resp)) = chat(State(manager), Json(req)).await;

    let mut events: Vec<Event> = Vec::new();
    events.push(Event::default().data(serde_json::json!({
        "event": "start"
    }).to_string()));

    if status != StatusCode::OK || !resp.success {
        events.push(Event::default().data(serde_json::json!({
            "event": "error",
            "error": resp.error.unwrap_or_else(|| "Chat failed".to_string())
        }).to_string()));
    } else if let Some(content) = resp.content {
        events.push(Event::default().data(serde_json::json!({
            "event": "delta",
            "delta": content
        }).to_string()));
    }

    events.push(Event::default().data(serde_json::json!({
        "event": "done"
    }).to_string()));

    Sse::new(iter(events.into_iter().map(Ok)))
}
fn get_profile_name() -> Option<String> {
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

    for path in paths {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(profile) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(name) = profile.get("name").and_then(|n| n.as_str()) {
                    let trimmed = name.trim();
                    if !trimmed.is_empty() {
                        return Some(trimmed.to_string());
                    }
                }
            }
        }
    }
    None
}
