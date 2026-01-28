use anyhow::{anyhow, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GgufMetadataSummary {
    pub version: u32,
    pub tensor_count: u64,
    pub kv_count: u64,
    #[serde(default)]
    pub architecture: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub quantization_version: Option<u32>,
    #[serde(default)]
    pub context_length: Option<u32>,
    #[serde(default)]
    pub embedding_length: Option<u32>,
    #[serde(default)]
    pub block_count: Option<u32>,
    #[serde(default)]
    pub head_count: Option<u32>,
    #[serde(default)]
    pub head_count_kv: Option<u32>,
    #[serde(default)]
    pub rope_freq_base: Option<f32>,
    #[serde(default)]
    pub rope_freq_scale: Option<f32>,
    #[serde(default)]
    pub tokenizer_model: Option<String>,
    #[serde(default)]
    pub vocab_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelIndexEntry {
    pub filename: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_unix: i64,
    #[serde(default)]
    pub gguf: Option<GgufMetadataSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelIndexCache {
    pub schema_version: u32,
    pub generated_at: String,
    pub entries: Vec<ModelIndexEntry>,
}

#[derive(Debug, Clone)]
pub struct ModelIndex {
    pub entries: HashMap<String, ModelIndexEntry>,
    pub scanned_at: String,
    pub updated: bool,
    #[allow(dead_code)]
    pub cache_path: PathBuf,
}

pub fn load_or_refresh_index(force_refresh: bool) -> Result<ModelIndex> {
    let cache_path = get_model_index_path();
    let cached = load_cache(&cache_path).unwrap_or(ModelIndexCache {
        schema_version: 1,
        generated_at: Utc::now().to_rfc3339(),
        entries: Vec::new(),
    });

    let mut cached_map: HashMap<String, ModelIndexEntry> = HashMap::new();
    for entry in cached.entries {
        cached_map.insert(entry.filename.clone(), entry);
    }

    let models_dir = get_models_dir();
    let mut entries: HashMap<String, ModelIndexEntry> = HashMap::new();
    let mut updated = force_refresh;

    if let Ok(dir_entries) = std::fs::read_dir(models_dir) {
        for entry in dir_entries.flatten() {
            let path = entry.path();
            if !path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.eq_ignore_ascii_case("gguf"))
                .unwrap_or(false)
            {
                continue;
            }

            let filename = match path.file_name().and_then(|n| n.to_str()) {
                Some(name) => name.to_string(),
                None => continue,
            };

            let metadata = match std::fs::metadata(&path) {
                Ok(value) => value,
                Err(err) => {
                    tracing::warn!("Failed to read metadata for {:?}: {}", path, err);
                    continue;
                }
            };
            let size_bytes = metadata.len();
            let modified_unix = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|duration| duration.as_secs() as i64)
                .unwrap_or(0);

            if !force_refresh {
                if let Some(cached_entry) = cached_map.get(&filename) {
                    if cached_entry.size_bytes == size_bytes
                        && cached_entry.modified_unix == modified_unix
                    {
                        entries.insert(filename.clone(), cached_entry.clone());
                        continue;
                    }
                }
            }

            let gguf = match parse_gguf_metadata(&path) {
                Ok(value) => Some(value),
                Err(err) => {
                    tracing::warn!("Failed to parse GGUF metadata for {:?}: {}", path, err);
                    None
                }
            };

            entries.insert(
                filename.clone(),
                ModelIndexEntry {
                    filename,
                    path: path.to_string_lossy().to_string(),
                    size_bytes,
                    modified_unix,
                    gguf,
                },
            );
            updated = true;
        }
    }

    if entries.len() != cached_map.len() {
        updated = true;
    }

    if updated {
        let cache = ModelIndexCache {
            schema_version: 1,
            generated_at: Utc::now().to_rfc3339(),
            entries: entries.values().cloned().collect(),
        };
        if let Err(err) = save_cache(&cache_path, &cache) {
            tracing::warn!(
                "Failed to write model index cache {:?}: {}",
                cache_path,
                err
            );
        }
    }

    Ok(ModelIndex {
        entries,
        scanned_at: Utc::now().to_rfc3339(),
        updated,
        cache_path,
    })
}

fn load_cache(path: &Path) -> Result<ModelIndexCache> {
    let content = std::fs::read_to_string(path)?;
    let cache: ModelIndexCache = serde_json::from_str(&content)?;
    Ok(cache)
}

fn save_cache(path: &Path, cache: &ModelIndexCache) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(cache)?;
    std::fs::write(path, content)?;
    Ok(())
}

fn get_model_index_path() -> PathBuf {
    let data_dir = get_data_dir();
    data_dir.join("model_index.json")
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

fn get_models_dir() -> PathBuf {
    let cwd_path = PathBuf::from("models");
    if cwd_path.exists() {
        return cwd_path;
    }

    let sibling_path = PathBuf::from("../models");
    if sibling_path.exists() {
        return sibling_path;
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let models_dir = exe_dir.join("../models");
            if models_dir.exists() {
                return models_dir;
            }
            let models_root = exe_dir.join("models");
            if models_root.exists() {
                return models_root;
            }
        }
    }
    PathBuf::from("models")
}

fn parse_gguf_metadata(path: &Path) -> Result<GgufMetadataSummary> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);

    let mut magic = [0u8; 4];
    reader.read_exact(&mut magic)?;
    if &magic != b"GGUF" {
        return Err(anyhow!("Invalid GGUF magic"));
    }

    let version = read_u32(&mut reader)?;
    let tensor_count = read_u64(&mut reader)?;
    let kv_count = read_u64(&mut reader)?;

    let mut summary = GgufMetadataSummary {
        version,
        tensor_count,
        kv_count,
        architecture: None,
        name: None,
        quantization_version: None,
        context_length: None,
        embedding_length: None,
        block_count: None,
        head_count: None,
        head_count_kv: None,
        rope_freq_base: None,
        rope_freq_scale: None,
        tokenizer_model: None,
        vocab_size: None,
    };

    for _ in 0..kv_count {
        let key_len = read_u64(&mut reader)? as usize;
        let mut key_bytes = vec![0u8; key_len];
        reader.read_exact(&mut key_bytes)?;
        let key = String::from_utf8_lossy(&key_bytes).to_string();

        let value_type = read_u32(&mut reader)?;
        match value_type {
            0 => handle_u8(&mut reader, &key, &mut summary)?,
            1 => handle_i8(&mut reader, &key)?,
            2 => handle_u16(&mut reader, &key, &mut summary)?,
            3 => handle_i16(&mut reader, &key)?,
            4 => handle_u32(&mut reader, &key, &mut summary)?,
            5 => handle_i32(&mut reader, &key)?,
            6 => handle_f32(&mut reader, &key, &mut summary)?,
            7 => handle_bool(&mut reader, &key)?,
            8 => handle_string(&mut reader, &key, &mut summary)?,
            9 => skip_array(&mut reader)?,
            10 => handle_u64(&mut reader, &key)?,
            11 => handle_i64(&mut reader, &key)?,
            12 => handle_f64(&mut reader, &key, &mut summary)?,
            _ => return Err(anyhow!("Unknown GGUF value type {}", value_type)),
        }
    }

    Ok(summary)
}

fn handle_u8(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let mut buf = [0u8; 1];
    reader.read_exact(&mut buf)?;
    let _ = buf[0];
    if key == "general.quantization_version" {
        summary.quantization_version = Some(buf[0] as u32);
    }
    Ok(())
}

fn handle_i8(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let mut buf = [0u8; 1];
    reader.read_exact(&mut buf)?;
    Ok(())
}

fn handle_u16(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let value = read_u16(reader)?;
    if key == "general.quantization_version" {
        summary.quantization_version = Some(value as u32);
    }
    Ok(())
}

fn handle_i16(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let _ = read_i16(reader)?;
    Ok(())
}

fn handle_u32(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let value = read_u32(reader)?;
    match key {
        "general.quantization_version" => summary.quantization_version = Some(value),
        "llama.context_length" => summary.context_length = Some(value),
        "llama.embedding_length" => summary.embedding_length = Some(value),
        "llama.block_count" => summary.block_count = Some(value),
        "llama.attention.head_count" => summary.head_count = Some(value),
        "llama.attention.head_count_kv" => summary.head_count_kv = Some(value),
        "tokenizer.ggml.n_vocab" => summary.vocab_size = Some(value),
        _ => {}
    }
    Ok(())
}

fn handle_i32(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let _ = read_i32(reader)?;
    Ok(())
}

fn handle_f32(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let value = read_f32(reader)?;
    match key {
        "llama.rope.freq_base" => summary.rope_freq_base = Some(value),
        "llama.rope.scale" => summary.rope_freq_scale = Some(value),
        _ => {}
    }
    Ok(())
}

fn handle_bool(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let mut buf = [0u8; 1];
    reader.read_exact(&mut buf)?;
    Ok(())
}

fn handle_string(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let len = read_u64(reader)? as usize;
    if matches!(
        key,
        "general.architecture" | "general.name" | "tokenizer.ggml.model"
    ) {
        let mut buf = vec![0u8; len];
        reader.read_exact(&mut buf)?;
        let value = String::from_utf8_lossy(&buf).to_string();
        match key {
            "general.architecture" => summary.architecture = Some(value),
            "general.name" => summary.name = Some(value),
            "tokenizer.ggml.model" => summary.tokenizer_model = Some(value),
            _ => {}
        }
    } else {
        skip_bytes(reader, len as u64)?;
    }
    Ok(())
}

fn handle_u64(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let _ = read_u64(reader)?;
    Ok(())
}

fn handle_i64(reader: &mut BufReader<File>, _key: &str) -> Result<()> {
    let _ = read_i64(reader)?;
    Ok(())
}

fn handle_f64(
    reader: &mut BufReader<File>,
    key: &str,
    summary: &mut GgufMetadataSummary,
) -> Result<()> {
    let value = read_f64(reader)? as f32;
    match key {
        "llama.rope.freq_base" => summary.rope_freq_base = Some(value),
        "llama.rope.scale" => summary.rope_freq_scale = Some(value),
        _ => {}
    }
    Ok(())
}

fn skip_array(reader: &mut BufReader<File>) -> Result<()> {
    let element_type = read_u32(reader)?;
    let len = read_u64(reader)?;
    match element_type {
        8 => {
            for _ in 0..len {
                let size = read_u64(reader)?;
                skip_bytes(reader, size)?;
            }
        }
        9 => return Err(anyhow!("Nested arrays are not supported in GGUF")),
        _ => {
            let element_size = match element_type {
                0 | 1 | 7 => 1,
                2 | 3 => 2,
                4 | 5 | 6 => 4,
                10 | 11 | 12 => 8,
                _ => return Err(anyhow!("Unknown GGUF array element type {}", element_type)),
            };
            skip_bytes(reader, element_size as u64 * len)?;
        }
    }
    Ok(())
}

fn skip_bytes(reader: &mut BufReader<File>, len: u64) -> Result<()> {
    reader.seek(SeekFrom::Current(len as i64))?;
    Ok(())
}

fn read_u16(reader: &mut BufReader<File>) -> Result<u16> {
    let mut buf = [0u8; 2];
    reader.read_exact(&mut buf)?;
    Ok(u16::from_le_bytes(buf))
}

fn read_i16(reader: &mut BufReader<File>) -> Result<i16> {
    let mut buf = [0u8; 2];
    reader.read_exact(&mut buf)?;
    Ok(i16::from_le_bytes(buf))
}

fn read_u32(reader: &mut BufReader<File>) -> Result<u32> {
    let mut buf = [0u8; 4];
    reader.read_exact(&mut buf)?;
    Ok(u32::from_le_bytes(buf))
}

fn read_i32(reader: &mut BufReader<File>) -> Result<i32> {
    let mut buf = [0u8; 4];
    reader.read_exact(&mut buf)?;
    Ok(i32::from_le_bytes(buf))
}

fn read_u64(reader: &mut BufReader<File>) -> Result<u64> {
    let mut buf = [0u8; 8];
    reader.read_exact(&mut buf)?;
    Ok(u64::from_le_bytes(buf))
}

fn read_i64(reader: &mut BufReader<File>) -> Result<i64> {
    let mut buf = [0u8; 8];
    reader.read_exact(&mut buf)?;
    Ok(i64::from_le_bytes(buf))
}

fn read_f32(reader: &mut BufReader<File>) -> Result<f32> {
    let mut buf = [0u8; 4];
    reader.read_exact(&mut buf)?;
    Ok(f32::from_le_bytes(buf))
}

fn read_f64(reader: &mut BufReader<File>) -> Result<f64> {
    let mut buf = [0u8; 8];
    reader.read_exact(&mut buf)?;
    Ok(f64::from_le_bytes(buf))
}
