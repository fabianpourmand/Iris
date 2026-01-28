use anyhow::{anyhow, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};

const MANIFEST_FILE: &str = "language_pack.json";
const INDEX_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguagePackResource {
    pub id: String,
    pub path: String,
    pub kind: String,
    #[serde(default)]
    pub checksum_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguagePackManifest {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub locale: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub license: Option<String>,
    #[serde(default)]
    pub fallback_locale: Option<String>,
    #[serde(default)]
    pub resources: Vec<LanguagePackResource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguagePackIndexEntry {
    pub id: String,
    pub path: String,
    #[serde(default)]
    pub manifest: Option<LanguagePackManifest>,
    pub modified_unix: i64,
    pub valid: bool,
    #[serde(default)]
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguagePackIndexCache {
    pub schema_version: u32,
    pub generated_at: String,
    pub entries: Vec<LanguagePackIndexEntry>,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct LanguagePackIndex {
    pub entries: Vec<LanguagePackIndexEntry>,
    pub scanned_at: String,
    pub updated: bool,
    pub cache_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveLanguagePack {
    pub active_id: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LanguagePackList {
    pub active_id: Option<String>,
    pub packs: Vec<LanguagePackIndexEntry>,
}

pub fn list_language_packs(force_refresh: bool) -> Result<LanguagePackList> {
    let index = load_or_refresh_language_pack_index(force_refresh)?;
    let mut active = load_active_language_pack().unwrap_or(ActiveLanguagePack {
        active_id: None,
        updated_at: Utc::now().to_rfc3339(),
    });

    let active_valid = active.active_id.as_ref().and_then(|id| {
        index
            .entries
            .iter()
            .find(|entry| entry.id == *id && entry.valid)
            .map(|_| id.clone())
    });

    if active.active_id != active_valid {
        active = set_active_language_pack(active_valid.as_deref())?;
    }

    Ok(LanguagePackList {
        active_id: active.active_id,
        packs: index.entries,
    })
}

pub fn install_language_pack(source_path: &Path) -> Result<LanguagePackIndexEntry> {
    if !source_path.exists() {
        return Err(anyhow!("Source path does not exist"));
    }
    if !source_path.is_dir() {
        return Err(anyhow!("Source path must be a directory"));
    }

    let manifest_path = source_path.join(MANIFEST_FILE);
    let manifest =
        read_manifest(&manifest_path).map_err(|err| anyhow!("Failed to read manifest: {}", err))?;
    let validation_errors = validate_manifest(&manifest, source_path, None);
    if !validation_errors.is_empty() {
        return Err(anyhow!(
            "Manifest validation failed: {}",
            validation_errors.join("; ")
        ));
    }

    let installed_dir = get_language_pack_installed_dir();
    let target_dir = installed_dir.join(&manifest.id);
    if target_dir.exists() {
        return Err(anyhow!(
            "Language pack '{}' is already installed",
            manifest.id
        ));
    }

    let staging_dir =
        get_language_pack_staging_dir().join(format!("{}-{}", manifest.id, uuid::Uuid::new_v4()));

    fs::create_dir_all(&staging_dir)?;
    if let Err(err) = copy_dir_all(source_path, &staging_dir) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(anyhow!("Failed to copy language pack: {}", err));
    }

    let staging_manifest_path = staging_dir.join(MANIFEST_FILE);
    let staged_manifest = read_manifest(&staging_manifest_path)
        .map_err(|err| anyhow!("Failed to read staged manifest: {}", err))?;
    let staged_errors = validate_manifest(&staged_manifest, &staging_dir, None);
    if !staged_errors.is_empty() {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(anyhow!(
            "Staged manifest validation failed: {}",
            staged_errors.join("; ")
        ));
    }

    if let Some(parent) = target_dir.parent() {
        fs::create_dir_all(parent)?;
    }

    if let Err(err) = fs::rename(&staging_dir, &target_dir) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(anyhow!("Failed to finalize install: {}", err));
    }

    let entry = build_pack_entry(&target_dir)?;
    let _ = load_or_refresh_language_pack_index(true);
    Ok(entry)
}

pub fn remove_language_pack(id: &str) -> Result<()> {
    let installed_dir = get_language_pack_installed_dir();
    let target_dir = installed_dir.join(id);
    if !target_dir.exists() {
        return Err(anyhow!("Language pack '{}' is not installed", id));
    }

    let trash_dir =
        get_language_pack_trash_dir().join(format!("{}-{}", id, Utc::now().timestamp()));
    if let Some(parent) = trash_dir.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::rename(&target_dir, &trash_dir)
        .map_err(|err| anyhow!("Failed to stage removal: {}", err))?;

    if let Err(err) = fs::remove_dir_all(&trash_dir) {
        let rollback = fs::rename(&trash_dir, &target_dir);
        if rollback.is_err() {
            return Err(anyhow!(
                "Failed to remove language pack and rollback failed: {}",
                err
            ));
        }
        return Err(anyhow!("Failed to remove language pack: {}", err));
    }

    let active = load_active_language_pack().ok();
    if let Some(active_pack) = active.and_then(|pack| pack.active_id) {
        if active_pack == id {
            let _ = set_active_language_pack(None);
        }
    }

    let _ = load_or_refresh_language_pack_index(true);
    Ok(())
}

pub fn activate_language_pack(id: Option<&str>) -> Result<ActiveLanguagePack> {
    if let Some(pack_id) = id {
        let installed_dir = get_language_pack_installed_dir();
        let pack_dir = installed_dir.join(pack_id);
        if !pack_dir.exists() {
            return Err(anyhow!("Language pack '{}' is not installed", pack_id));
        }
        let entry = build_pack_entry(&pack_dir)?;
        if !entry.valid {
            return Err(anyhow!("Language pack '{}' is invalid", pack_id));
        }
    }

    set_active_language_pack(id)
}

pub fn load_or_refresh_language_pack_index(force_refresh: bool) -> Result<LanguagePackIndex> {
    let cache_path = get_language_pack_index_path();
    let installed_dir = get_language_pack_installed_dir();
    let cached = if !force_refresh {
        load_cache(&cache_path).ok()
    } else {
        None
    };

    let mut updated = force_refresh || cached.is_none();
    let mut entries = if let Some(cache) = cached {
        let cached_count = cache.entries.len();
        let current_count = if installed_dir.exists() {
            fs::read_dir(&installed_dir)
                .map(|entries| {
                    entries
                        .flatten()
                        .filter(|entry| {
                            entry
                                .file_name()
                                .to_str()
                                .map(|name| !name.starts_with('.'))
                                .unwrap_or(false)
                                && entry.file_type().map(|ty| ty.is_dir()).unwrap_or(false)
                        })
                        .count()
                })
                .unwrap_or(0)
        } else {
            0
        };

        let needs_refresh = cached_count != current_count
            || cache.entries.iter().any(|entry| {
                let manifest_path = Path::new(&entry.path).join(MANIFEST_FILE);
                match fs::metadata(&manifest_path) {
                    Ok(metadata) => metadata
                        .modified()
                        .ok()
                        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|duration| duration.as_secs() as i64)
                        .map(|modified| modified != entry.modified_unix)
                        .unwrap_or(true),
                    Err(_) => true,
                }
            });

        if !needs_refresh {
            return Ok(LanguagePackIndex {
                entries: cache.entries,
                scanned_at: cache.generated_at,
                updated: false,
                cache_path,
            });
        }

        updated = true;
        Vec::new()
    } else {
        Vec::new()
    };

    if installed_dir.exists() {
        for entry in fs::read_dir(&installed_dir)? {
            let entry = entry?;
            let file_type = entry.file_type()?;
            if !file_type.is_dir() {
                continue;
            }
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with('.') {
                    continue;
                }
            }
            let pack_entry = build_pack_entry(&entry.path());
            match pack_entry {
                Ok(pack) => entries.push(pack),
                Err(err) => {
                    let id = entry.file_name().to_str().unwrap_or("unknown").to_string();
                    entries.push(LanguagePackIndexEntry {
                        id,
                        path: entry.path().to_string_lossy().to_string(),
                        manifest: None,
                        modified_unix: 0,
                        valid: false,
                        errors: vec![format!("Failed to read pack: {}", err)],
                    });
                }
            }
        }
    }

    if updated {
        let cache = LanguagePackIndexCache {
            schema_version: INDEX_SCHEMA_VERSION,
            generated_at: Utc::now().to_rfc3339(),
            entries: entries.clone(),
        };
        let _ = save_cache(&cache_path, &cache);
    }

    Ok(LanguagePackIndex {
        entries,
        scanned_at: Utc::now().to_rfc3339(),
        updated,
        cache_path,
    })
}

fn build_pack_entry(pack_dir: &Path) -> Result<LanguagePackIndexEntry> {
    let manifest_path = pack_dir.join(MANIFEST_FILE);
    let modified_unix = fs::metadata(&manifest_path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);

    let manifest = read_manifest(&manifest_path).ok();
    let folder_name = pack_dir.file_name().and_then(|name| name.to_str());
    let mut errors = Vec::new();

    if let Some(manifest_ref) = &manifest {
        errors.extend(validate_manifest(manifest_ref, pack_dir, folder_name));
    } else {
        errors.push("Missing or invalid manifest".to_string());
    }

    let id = manifest
        .as_ref()
        .map(|value| value.id.clone())
        .or_else(|| folder_name.map(|name| name.to_string()))
        .unwrap_or_else(|| "unknown".to_string());

    Ok(LanguagePackIndexEntry {
        id,
        path: pack_dir.to_string_lossy().to_string(),
        manifest,
        modified_unix,
        valid: errors.is_empty(),
        errors,
    })
}

fn read_manifest(path: &Path) -> Result<LanguagePackManifest> {
    let content = fs::read_to_string(path)?;
    let manifest: LanguagePackManifest = serde_json::from_str(&content)?;
    Ok(manifest)
}

fn validate_manifest(
    manifest: &LanguagePackManifest,
    pack_dir: &Path,
    folder_name: Option<&str>,
) -> Vec<String> {
    let mut errors = Vec::new();

    if manifest.schema_version != INDEX_SCHEMA_VERSION {
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

    if let Some(name) = folder_name {
        if !name.is_empty() && name != manifest.id {
            errors.push("Manifest id does not match folder name".to_string());
        }
    }

    if manifest.name.trim().is_empty() {
        errors.push("Manifest name is required".to_string());
    }
    if manifest.locale.trim().is_empty() {
        errors.push("Manifest locale is required".to_string());
    } else if !is_valid_locale(&manifest.locale) {
        errors.push("Manifest locale contains invalid characters".to_string());
    }
    if manifest.version.trim().is_empty() {
        errors.push("Manifest version is required".to_string());
    }
    if let Some(fallback) = &manifest.fallback_locale {
        if !fallback.is_empty() && !is_valid_locale(fallback) {
            errors.push("Fallback locale contains invalid characters".to_string());
        }
    }

    for resource in &manifest.resources {
        if resource.id.trim().is_empty() {
            errors.push("Resource id is required".to_string());
        }
        if resource.kind.trim().is_empty() {
            errors.push(format!("Resource '{}' kind is required", resource.id));
        }
        if resource.path.trim().is_empty() {
            errors.push(format!("Resource '{}' path is required", resource.id));
            continue;
        }
        if !is_safe_relative_path(&resource.path) {
            errors.push(format!(
                "Resource '{}' path must be a safe relative path",
                resource.id
            ));
            continue;
        }
        let resource_path = pack_dir.join(&resource.path);
        if !resource_path.exists() {
            errors.push(format!(
                "Resource '{}' missing at {}",
                resource.id, resource.path
            ));
            continue;
        }
        if let Some(checksum) = &resource.checksum_sha256 {
            match compute_sha256(&resource_path) {
                Ok(actual) => {
                    if !checksum.eq_ignore_ascii_case(&actual) {
                        errors.push(format!("Resource '{}' checksum mismatch", resource.id));
                    }
                }
                Err(err) => errors.push(format!(
                    "Resource '{}' checksum failed: {}",
                    resource.id, err
                )),
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

fn is_valid_locale(value: &str) -> bool {
    value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
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

fn copy_dir_all(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let source_path = entry.path();
        let target_path = dst.join(entry.file_name());

        if file_type.is_symlink() {
            return Err(anyhow!("Symlinks are not allowed in language packs"));
        }

        if file_type.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else if file_type.is_file() {
            fs::copy(&source_path, &target_path)?;
        }
    }
    Ok(())
}

fn compute_sha256(path: &Path) -> Result<String> {
    let bytes = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    Ok(format!("{:x}", digest))
}

fn load_cache(path: &Path) -> Result<LanguagePackIndexCache> {
    let content = fs::read_to_string(path)?;
    let cache: LanguagePackIndexCache = serde_json::from_str(&content)?;
    Ok(cache)
}

fn save_cache(path: &Path, cache: &LanguagePackIndexCache) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(cache)?;
    fs::write(path, content)?;
    Ok(())
}

fn load_active_language_pack() -> Result<ActiveLanguagePack> {
    let path = get_language_pack_active_path();
    let content = fs::read_to_string(path)?;
    let active: ActiveLanguagePack = serde_json::from_str(&content)?;
    Ok(active)
}

fn set_active_language_pack(id: Option<&str>) -> Result<ActiveLanguagePack> {
    let active = ActiveLanguagePack {
        active_id: id.map(|value| value.to_string()),
        updated_at: Utc::now().to_rfc3339(),
    };
    let path = get_language_pack_active_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(&active)?;
    fs::write(path, content)?;
    Ok(active)
}

fn get_language_pack_root() -> PathBuf {
    let data_dir = get_data_dir();
    data_dir.join("language_packs")
}

fn get_language_pack_installed_dir() -> PathBuf {
    get_language_pack_root().join("installed")
}

fn get_language_pack_staging_dir() -> PathBuf {
    get_language_pack_root().join(".staging")
}

fn get_language_pack_trash_dir() -> PathBuf {
    get_language_pack_root().join(".trash")
}

fn get_language_pack_index_path() -> PathBuf {
    get_language_pack_root().join("index.json")
}

fn get_language_pack_active_path() -> PathBuf {
    get_language_pack_root().join("active.json")
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
