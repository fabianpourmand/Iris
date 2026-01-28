use anyhow::{anyhow, Result};
use std::path::{Path, PathBuf};

const PATH_DENYLIST_SEGMENTS: [&str; 12] = [
    ".git",
    ".hg",
    ".svn",
    ".ssh",
    ".gnupg",
    ".aws",
    ".config",
    "library",
    "system",
    "windows",
    "program files",
    "program files (x86)",
];

const PATH_DENYLIST_BASENAMES: [&str; 9] = [
    ".npmrc",
    ".pypirc",
    ".netrc",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "id_dsa",
    "authorized_keys",
    "known_hosts",
];

const PATH_DENYLIST_PREFIXES: [&str; 1] = [".env"];

pub fn resolve_root(root: Option<&str>) -> Result<PathBuf> {
    let root_value = root.unwrap_or(".");
    let root_path = Path::new(root_value);
    if root_path.as_os_str().is_empty() {
        return Err(anyhow!("Root path is required"));
    }
    let canonical = root_path
        .canonicalize()
        .map_err(|_| anyhow!("Root path not found"))?;
    if !canonical.is_dir() {
        return Err(anyhow!("Root path must be a directory"));
    }
    if is_denied_path(&canonical, &canonical) {
        return Err(anyhow!("Root path is not allowed"));
    }
    Ok(canonical)
}

pub fn resolve_path(root: &Path, path: Option<&str>) -> Result<PathBuf> {
    let path_value = path.unwrap_or(".");
    let candidate = Path::new(path_value);
    let joined = if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        root.join(candidate)
    };

    let resolved = if joined.exists() {
        joined
            .canonicalize()
            .map_err(|_| anyhow!("Failed to resolve path"))?
    } else {
        let parent = joined.parent().unwrap_or(root);
        let resolved_parent = parent
            .canonicalize()
            .map_err(|_| anyhow!("Failed to resolve path"))?;
        if let Some(name) = joined.file_name() {
            resolved_parent.join(name)
        } else {
            resolved_parent
        }
    };

    if !resolved.starts_with(root) {
        return Err(anyhow!("Path is outside the workspace root"));
    }

    if is_denied_path(root, &resolved) {
        return Err(anyhow!("Path is not allowed"));
    }

    Ok(resolved)
}

fn is_denied_path(root: &Path, candidate: &Path) -> bool {
    let relative = candidate.strip_prefix(root).unwrap_or(candidate);
    for component in relative.components() {
        if let Some(value) = component.as_os_str().to_str() {
            let lowered = value.to_ascii_lowercase();
            if PATH_DENYLIST_SEGMENTS.contains(&lowered.as_str()) {
                return true;
            }
            if PATH_DENYLIST_BASENAMES.contains(&lowered.as_str()) {
                return true;
            }
            if PATH_DENYLIST_PREFIXES
                .iter()
                .any(|prefix| lowered.starts_with(prefix))
            {
                return true;
            }
        }
    }
    false
}
