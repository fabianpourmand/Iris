use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::time::Instant;

use crate::SharedLlmManager;

#[derive(Deserialize)]
pub struct BenchmarkRequest {
    pub model_id: String,
    pub ctx: Option<u32>,
    pub threads: Option<u32>,
    pub gpu_layers: Option<u32>,
}

#[derive(Serialize)]
pub struct BenchmarkResponse {
    pub success: bool,
    pub tokens_per_second: Option<f64>,
    pub total_tokens: Option<u32>,
    pub elapsed_seconds: Option<f64>,
    pub error: Option<String>,
}

const BENCHMARK_PROMPT: &str = "Explain the concept of artificial intelligence in simple terms. What are its main applications in everyday life?";
const BENCHMARK_MAX_TOKENS: u32 = 64;

pub async fn run_benchmark(
    State(manager): State<SharedLlmManager>,
    Json(req): Json<BenchmarkRequest>,
) -> Json<BenchmarkResponse> {
    // First, start the model if not already running with this model
    {
        let mut mgr = manager.lock().await;
        let should_start = !mgr.is_running() || mgr.current_model_id().as_ref() != Some(&req.model_id);
        
        if should_start {
            // Stop any existing model
            let _ = mgr.stop();
            
            // Find and start the requested model
            let manifest_path = if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    let p = exe_dir.join("../models/manifest.json");
                    if p.exists() { p } else { std::path::PathBuf::from("./models/manifest.json") }
                } else {
                    std::path::PathBuf::from("./models/manifest.json")
                }
            } else {
                std::path::PathBuf::from("./models/manifest.json")
            };

            let models: Vec<super::models::ModelInfo> = match std::fs::read_to_string(&manifest_path) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                Err(_) => vec![],
            };

            let model = match models.iter().find(|m| m.id == req.model_id) {
                Some(m) => m,
                None => {
                    return Json(BenchmarkResponse {
                        success: false,
                        tokens_per_second: None,
                        total_tokens: None,
                        elapsed_seconds: None,
                        error: Some(format!("Model '{}' not found", req.model_id)),
                    });
                }
            };

            let model_path = super::models::get_model_path(&model.filename);
            if !model_path.exists() {
                return Json(BenchmarkResponse {
                    success: false,
                    tokens_per_second: None,
                    total_tokens: None,
                    elapsed_seconds: None,
                    error: Some(format!("Model file not found: {:?}", model_path)),
                });
            }

            let ctx = req.ctx.unwrap_or(model.recommended_ctx);
            let threads = req.threads.unwrap_or(4);

            if let Err(e) = mgr.start(
                model_path.to_string_lossy().to_string(),
                req.model_id.clone(),
                ctx,
                threads,
                req.gpu_layers,
            ) {
                return Json(BenchmarkResponse {
                    success: false,
                    tokens_per_second: None,
                    total_tokens: None,
                    elapsed_seconds: None,
                    error: Some(format!("Failed to start model: {}", e)),
                });
            }

            // Wait a bit for the server to be ready
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        }
    }

    // Wait for LLM to be ready (retry a few times)
    let client = reqwest::Client::new();
    let mut ready = false;
    for _ in 0..10 {
        if client.get("http://127.0.0.1:7778/health").send().await.is_ok() {
            ready = true;
            break;
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    if !ready {
        return Json(BenchmarkResponse {
            success: false,
            tokens_per_second: None,
            total_tokens: None,
            elapsed_seconds: None,
            error: Some("LLM server not ready after waiting".to_string()),
        });
    }

    // Run the benchmark
    let start = Instant::now();
    
    let llama_request = serde_json::json!({
        "model": "local",
        "messages": [{
            "role": "user",
            "content": BENCHMARK_PROMPT
        }],
        "temperature": 0.7,
        "max_tokens": BENCHMARK_MAX_TOKENS,
        "stream": false
    });

    let response = client
        .post("http://127.0.0.1:7778/v1/chat/completions")
        .json(&llama_request)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await;

    let elapsed = start.elapsed().as_secs_f64();

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                #[derive(Deserialize)]
                struct BenchResponse {
                    usage: Option<BenchUsage>,
                }
                #[derive(Deserialize)]
                struct BenchUsage {
                    completion_tokens: u32,
                }

                match resp.json::<BenchResponse>().await {
                    Ok(bench_resp) => {
                        let completion_tokens = bench_resp.usage
                            .map(|u| u.completion_tokens)
                            .unwrap_or(BENCHMARK_MAX_TOKENS);
                        
                        let tokens_per_second = completion_tokens as f64 / elapsed;

                        Json(BenchmarkResponse {
                            success: true,
                            tokens_per_second: Some((tokens_per_second * 100.0).round() / 100.0),
                            total_tokens: Some(completion_tokens),
                            elapsed_seconds: Some((elapsed * 100.0).round() / 100.0),
                            error: None,
                        })
                    }
                    Err(e) => Json(BenchmarkResponse {
                        success: false,
                        tokens_per_second: None,
                        total_tokens: None,
                        elapsed_seconds: None,
                        error: Some(format!("Failed to parse response: {}", e)),
                    }),
                }
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                Json(BenchmarkResponse {
                    success: false,
                    tokens_per_second: None,
                    total_tokens: None,
                    elapsed_seconds: None,
                    error: Some(format!("LLM error: {}", error_text)),
                })
            }
        }
        Err(e) => Json(BenchmarkResponse {
            success: false,
            tokens_per_second: None,
            total_tokens: None,
            elapsed_seconds: None,
            error: Some(format!("Request failed: {}", e)),
        }),
    }
}
