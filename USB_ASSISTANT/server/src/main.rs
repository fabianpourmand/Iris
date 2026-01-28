mod api;
mod llm_manager;
mod interpreter;
mod model_index;
mod language_packs;
mod firmware_updates;
mod sandbox;
mod workspace;
pub mod vision;
pub mod voice;

use axum::{Router, routing::{get, post}};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::llm_manager::LlmManager;

pub type SharedLlmManager = Arc<Mutex<LlmManager>>;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting IRIS server...");

    // Create shared LLM manager
    let llm_manager: SharedLlmManager = Arc::new(Mutex::new(LlmManager::new()));

    // Build API routes
    let api_routes = Router::new()
        .route("/health", get(api::health::health_check))
        .route("/system_info", get(api::system_info::get_system_info))
        .route("/models", get(api::models::get_models))
        .route("/models/refresh", post(api::models::refresh_models))
        .route("/llm/start", post(api::llm::start_llm))
        .route("/llm/stop", post(api::llm::stop_llm))
        .route("/llm/status", get(api::llm::llm_status))
        .route("/llm/preflight", post(api::llm::preflight_llm))
        .route("/chat", post(api::chat::chat))
        .route("/chat/stream", post(api::chat::chat_stream))
        .route("/profile", get(api::profile::get_profile).post(api::profile::save_profile))
        .route("/chats", get(api::chats::list_chats).post(api::chats::create_chat))
        .route("/chats/:id", get(api::chats::get_chat).post(api::chats::update_chat).delete(api::chats::delete_chat))
        .route("/benchmark", post(api::benchmark::run_benchmark))
        .route("/diagnostics", get(api::diagnostics::get_diagnostics))
        .route("/tools/execute", post(api::tools::execute_tool))
        .route("/vision/analyze", post(api::vision::analyze_image))
        .route("/voice/stt", post(api::voice::stt))
        .route("/voice/tts", post(api::voice::tts))
        .route("/language_packs", get(api::language_packs::list_language_packs_handler))
        .route(
            "/language_packs/install",
            post(api::language_packs::install_language_pack_handler),
        )
        .route(
            "/language_packs/remove",
            post(api::language_packs::remove_language_pack_handler),
        )
        .route(
            "/language_packs/activate",
            post(api::language_packs::activate_language_pack_handler),
        )
        .route(
            "/firmware_updates/status",
            get(api::firmware_updates::firmware_update_status_handler),
        )
        .route(
            "/firmware_updates/apply",
            post(api::firmware_updates::apply_firmware_update_handler),
        )
        .with_state(llm_manager);

    // 5. Robust static directory path resolution
    let static_dir = {
        let mut paths = vec![
            PathBuf::from("static"),
            PathBuf::from("../static"),
        ];

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                paths.push(exe_dir.join("static"));
                paths.push(exe_dir.join("../static"));
            }
        }

        paths.into_iter().find(|p: &PathBuf| p.exists()).unwrap_or_else(|| PathBuf::from("static"))
    };

    tracing::info!("Serving static files from: {:?}", static_dir);

    // Build main router with CORS
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new(&static_dir).append_index_html_on_directories(true))
        .layer(cors);

    // Create listener
    let addr = "127.0.0.1:7777";
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("Server listening on http://{}", addr);

    // Serve with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Server shutdown complete");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}
