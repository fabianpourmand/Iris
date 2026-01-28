use anyhow::{anyhow, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

const MANIFEST_FILE: &str = "firmware_update.json";
const PAYLOAD_DIR: &str = "payload";
const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareUpdateFile {
    pub path: String,
    pub checksum_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareUpdateDelete {
    pub path: String,
    #[serde(default)]
    pub checksum_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareUpdateManifest {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub created_at: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub files: Vec<FirmwareUpdateFile>,
    #[serde(default)]
    pub delete: Vec<FirmwareUpdateDelete>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirmwareUpdateRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub applied_at: String,
    pub status: String,
    pub files_applied: usize,
    pub files_deleted: usize,
    #[serde(default)]
    pub error: Option<String>,
}

pub fn load_last_firmware_update() -> Result<Option<FirmwareUpdateRecord>> {
    let status_path = get_firmware_status_path();
    match fs::read_to_string(status_path) {
        Ok(content) => {
            let record: FirmwareUpdateRecord = serde_json::from_str(&content)?;
            Ok(Some(record))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.into()),
    }
}

pub fn apply_firmware_update_pack(source_path: &Path) -> Result<FirmwareUpdateRecord> {
    if !source_path.exists() {
        return Err(anyhow!("Source path does not exist"));
    }
    if !source_path.is_dir() {
        return Err(anyhow!("Source path must be a directory"));
    }

    let manifest_path = source_path.join(MANIFEST_FILE);
    let manifest =
        read_manifest(&manifest_path).map_err(|err| anyhow!("Failed to read manifest: {}", err))?;
    let payload_dir = source_path.join(PAYLOAD_DIR);
    let validation_errors = validate_manifest(&manifest, &payload_dir);
    if !validation_errors.is_empty() {
        return Err(anyhow!(
            "Validation failed: {}",
            validation_errors.join("; ")
        ));
    }

    let firmware_root = get_firmware_root();
    fs::create_dir_all(&firmware_root)?;

    let rollback_dir =
        get_firmware_rollback_dir().join(format!("{}-{}", manifest.id, uuid::Uuid::new_v4()));
    fs::create_dir_all(&rollback_dir)?;

    let mut backups: Vec<(PathBuf, PathBuf)> = Vec::new();
    let mut created_files: Vec<PathBuf> = Vec::new();
    let mut files_deleted = 0usize;
    let mut files_applied = 0usize;

    let apply_result = (|| -> Result<FirmwareUpdateRecord> {
        let mut seen_paths = HashSet::new();
        let mut touch_paths = Vec::new();

        for file in &manifest.files {
            if seen_paths.insert(file.path.clone()) {
                touch_paths.push(file.path.clone());
            }
        }
        for entry in &manifest.delete {
            if seen_paths.insert(entry.path.clone()) {
                touch_paths.push(entry.path.clone());
            }
        }

        for relative in &touch_paths {
            let target_path = firmware_root.join(relative);
            if target_path.exists() {
                let metadata = fs::symlink_metadata(&target_path)?;
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    return Err(anyhow!("Target path '{}' is not a regular file", relative));
                }

                let backup_path = rollback_dir.join(relative);
                if let Some(parent) = backup_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(&target_path, &backup_path)?;
                backups.push((backup_path, target_path));
            } else {
                created_files.push(target_path);
            }
        }

        for entry in &manifest.delete {
            let target_path = firmware_root.join(&entry.path);
            if !target_path.exists() {
                continue;
            }
            let metadata = fs::symlink_metadata(&target_path)?;
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err(anyhow!(
                    "Target path '{}' is not a regular file",
                    entry.path
                ));
            }

            if let Some(expected) = &entry.checksum_sha256 {
                let actual = compute_sha256(&target_path)?;
                if !expected.eq_ignore_ascii_case(&actual) {
                    return Err(anyhow!("Delete checksum mismatch for '{}'", entry.path));
                }
            }

            fs::remove_file(&target_path)?;
            files_deleted += 1;
        }

        for file in &manifest.files {
            let source_file = payload_dir.join(&file.path);
            let target_path = firmware_root.join(&file.path);
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&source_file, &target_path)?;
            files_applied += 1;
        }

        let record = FirmwareUpdateRecord {
            id: manifest.id.clone(),
            name: manifest.name.clone(),
            version: manifest.version.clone(),
            applied_at: Utc::now().to_rfc3339(),
            status: "success".to_string(),
            files_applied,
            files_deleted,
            error: None,
        };
        save_last_firmware_update(&record)?;
        Ok(record)
    })();

    match apply_result {
        Ok(record) => {
            let _ = fs::remove_dir_all(&rollback_dir);
            Ok(record)
        }
        Err(err) => {
            let rollback_err = rollback_from_backup(&backups, &created_files);
            let record = FirmwareUpdateRecord {
                id: manifest.id.clone(),
                name: manifest.name.clone(),
                version: manifest.version.clone(),
                applied_at: Utc::now().to_rfc3339(),
                status: "failed".to_string(),
                files_applied,
                files_deleted,
                error: Some(err.to_string()),
            };
            let _ = save_last_firmware_update(&record);
            let _ = fs::remove_dir_all(&rollback_dir);
            if let Err(rollback_err) = rollback_err {
                return Err(anyhow!(
                    "Firmware update failed: {}. Rollback failed: {}",
                    err,
                    rollback_err
                ));
            }
            Err(err)
        }
    }
}

fn rollback_from_backup(backups: &[(PathBuf, PathBuf)], created_files: &[PathBuf]) -> Result<()> {
    for target in created_files {
        if target.exists() {
            let metadata = fs::symlink_metadata(target)?;
            if metadata.is_dir() {
                fs::remove_dir_all(target)?;
            } else {
                fs::remove_file(target)?;
            }
        }
    }

    for (backup_path, target_path) in backups {
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(backup_path, target_path)?;
    }

    Ok(())
}

fn read_manifest(path: &Path) -> Result<FirmwareUpdateManifest> {
    let content = fs::read_to_string(path)?;
    let manifest: FirmwareUpdateManifest = serde_json::from_str(&content)?;
    Ok(manifest)
}

fn validate_manifest(manifest: &FirmwareUpdateManifest, payload_dir: &Path) -> Vec<String> {
    let mut errors = Vec::new();

    if manifest.schema_version != SCHEMA_VERSION {
        errors.push(format!(
            "Unsupported schema_version {}",
            manifest.schema_version
        ));
    }

    if manifest.id.trim().is_empty() {
        errors.push("Manifest id is required".to_string());
    } else if !is_valid_id(&manifest.id) {
        errors.push("Manifest id contains invalid characters".to_string());
    }

    if manifest.name.trim().is_empty() {
        errors.push("Manifest name is required".to_string());
    }

    if manifest.version.trim().is_empty() {
        errors.push("Manifest version is required".to_string());
    }

    if manifest.created_at.trim().is_empty() {
        errors.push("Manifest created_at is required".to_string());
    }

    if !payload_dir.exists() {
        errors.push("Payload directory is missing".to_string());
    }

    if manifest.files.is_empty() && manifest.delete.is_empty() {
        errors.push("Manifest must include files or delete entries".to_string());
    }

    let mut seen_paths = HashSet::new();

    for file in &manifest.files {
        if file.path.trim().is_empty() {
            errors.push("File path is required".to_string());
            continue;
        }
        if !is_safe_relative_path(&file.path) {
            errors.push(format!(
                "File '{}' path must be a safe relative path",
                file.path
            ));
            continue;
        }
        if !seen_paths.insert(file.path.clone()) {
            errors.push(format!("Duplicate path '{}'", file.path));
            continue;
        }
        if file.checksum_sha256.trim().is_empty() {
            errors.push(format!("File '{}' checksum is required", file.path));
            continue;
        }
        if !is_valid_checksum(&file.checksum_sha256) {
            errors.push(format!("File '{}' checksum is invalid", file.path));
            continue;
        }

        let payload_path = payload_dir.join(&file.path);
        match fs::symlink_metadata(&payload_path) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    errors.push(format!("File '{}' is not a regular file", file.path));
                    continue;
                }
            }
            Err(_) => {
                errors.push(format!("File '{}' missing in payload", file.path));
                continue;
            }
        }

        match compute_sha256(&payload_path) {
            Ok(actual) => {
                if !file.checksum_sha256.eq_ignore_ascii_case(&actual) {
                    errors.push(format!("File '{}' checksum mismatch", file.path));
                }
            }
            Err(err) => errors.push(format!("File '{}' checksum failed: {}", file.path, err)),
        }
    }

    for entry in &manifest.delete {
        if entry.path.trim().is_empty() {
            errors.push("Delete path is required".to_string());
            continue;
        }
        if !is_safe_relative_path(&entry.path) {
            errors.push(format!(
                "Delete '{}' path must be a safe relative path",
                entry.path
            ));
            continue;
        }
        if !seen_paths.insert(entry.path.clone()) {
            errors.push(format!("Duplicate path '{}'", entry.path));
        }
        if let Some(checksum) = &entry.checksum_sha256 {
            if !checksum.trim().is_empty() && !is_valid_checksum(checksum) {
                errors.push(format!("Delete '{}' checksum is invalid", entry.path));
            }
        }
    }

    errors
}

fn is_valid_id(value: &str) -> bool {
    value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

fn is_valid_checksum(value: &str) -> bool {
    value.len() == 64 && value.chars().all(|c| c.is_ascii_hexdigit())
}

fn is_safe_relative_path(value: &str) -> bool {
    let candidate = Path::new(value);
    if candidate.as_os_str().is_empty() || candidate.is_absolute() {
        return false;
    }
    candidate.components().all(|component| {
        !matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    })
}

fn compute_sha256(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    Ok(format!("{:x}", digest))
}

fn save_last_firmware_update(record: &FirmwareUpdateRecord) -> Result<()> {
    let status_path = get_firmware_status_path();
    if let Some(parent) = status_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(record)?;
    fs::write(status_path, content)?;
    Ok(())
}

fn get_firmware_base() -> PathBuf {
    get_data_dir().join("firmware")
}

fn get_firmware_root() -> PathBuf {
    get_firmware_base().join("current")
}

fn get_firmware_rollback_dir() -> PathBuf {
    get_firmware_base().join(".rollback")
}

fn get_firmware_status_path() -> PathBuf {
    get_firmware_base().join("last_update.json")
}

fn get_data_dir() -> PathBuf {
    let mut candidates = vec![PathBuf::from("data"), PathBuf::from("../data")];

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("data"));
            candidates.push(exe_dir.join("../data"));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .unwrap_or_else(|| PathBuf::from("data"))
}
