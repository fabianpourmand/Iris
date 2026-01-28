use axum::{Json, extract::Multipart};
use crate::voice::{VoiceSubsystem, VoiceResult};

pub async fn stt(mut multipart: Multipart) -> Json<VoiceResult> {
    let mut audio_data = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "audio" {
            if let Ok(data) = field.bytes().await {
                audio_data = data.to_vec();
            }
        }
    }

    if audio_data.is_empty() {
        return Json(VoiceResult {
            success: false,
            text: None,
            audio_file: None,
            error: Some("No audio data provided".to_string()),
        });
    }

    let result = VoiceSubsystem::transcribe(audio_data).await;
    Json(result)
}

#[derive(serde::Deserialize)]
pub struct TtsRequest {
    pub text: String,
}

pub async fn tts(Json(payload): Json<TtsRequest>) -> Json<VoiceResult> {
    let result = VoiceSubsystem::synthesize(&payload.text).await;
    Json(result)
}
