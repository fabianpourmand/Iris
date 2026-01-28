use axum::{Json, extract::Multipart};
// use serde::Serialize;
use crate::vision::{VisionSubsystem, VisionResult};

pub async fn analyze_image(
    mut multipart: Multipart,
) -> Json<VisionResult> {
    let mut image_data = Vec::new();
    let mut category = String::from("general");

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" {
            if let Ok(data) = field.bytes().await {
                image_data = data.to_vec();
            }
        } else if name == "category" {
            if let Ok(data) = field.text().await {
                category = data;
            }
        }
    }

    if image_data.is_empty() {
        return Json(VisionResult {
            success: false,
            label: None,
            confidence: None,
            reasoning: None,
            error: Some("No image data provided".to_string()),
        });
    }

    let result = VisionSubsystem::identify_object(image_data, &category).await;
    Json(result)
}
