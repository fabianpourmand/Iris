#!/usr/bin/env python3
import json
import os
import platform
import re
import subprocess
import mimetypes
import shlex
import datetime
import secrets
import sys
import glob
import shutil
import threading
import urllib.request
import urllib.error
import hashlib
from typing import Any
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import unquote

# Import tkinter for file dialogs (fallback if native dialogs aren't available)
try:
    import tkinter as tk
    from tkinter import filedialog

    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False
    print("[WARNING] tkinter not available, file picking will be limited")

PORT = 7777
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(BASE_DIR, "data")
CHATS_DIR = os.path.join(DATA_DIR, "chats")
PROFILE_PATH = os.path.join(DATA_DIR, "profile.json")
MODELS_DIR = os.path.join(BASE_DIR, "models")
RUNTIME_DIR = os.path.join(BASE_DIR, "runtime")
LLAMA_PORT = 7778
LLAMA_TIMEOUT = 300

os.makedirs(CHATS_DIR, exist_ok=True)

_llm_process = None
_LLM_LOCK = threading.RLock()
_specialized_cache: dict[str, Any] = {"path": None, "mtime": None, "data": None}
llm_state = {"running": False, "model_id": None, "port": LLAMA_PORT, "category": None}


def get_system_info():
    info = {
        "cpu_name": platform.processor() or "Unknown CPU",
        "cpu_cores": os.cpu_count() or 1,
        "ram_total_gb": 0,
        "ram_available_gb": 0,
        "os": platform.system(),
        "arch": platform.machine(),
        "gpu": None,
    }

    # Get RAM info
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["sysctl", "-n", "hw.memsize"], capture_output=True, text=True
            )
            total_bytes = int(result.stdout.strip())
            info["ram_total_gb"] = round(total_bytes / (1024**3), 1)

            result = subprocess.run(["vm_stat"], capture_output=True, text=True)
            lines = result.stdout.split("\n")
            free_pages = 0
            for line in lines:
                if "Pages free" in line:
                    free_pages = int(line.split(":")[1].strip().rstrip("."))
                    break
            info["ram_available_gb"] = round((free_pages * 4096) / (1024**3), 1)

            # Better RAM available estimate
            result = subprocess.run(
                ["memory_pressure"], capture_output=True, text=True, timeout=5
            )
            # Fallback: estimate 60% available
            info["ram_available_gb"] = round(info["ram_total_gb"] * 0.6, 1)
        except:
            info["ram_total_gb"] = 16.0
            info["ram_available_gb"] = 10.0

    # Get GPU info
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["system_profiler", "SPDisplaysDataType", "-json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            data = json.loads(result.stdout)
            displays = data.get("SPDisplaysDataType", [])
            if displays:
                info["gpu"] = displays[0].get("sppci_model", None)
        except:
            pass

    # Get better CPU name on Mac
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True,
                text=True,
            )
            cpu = result.stdout.strip()
            if cpu:
                info["cpu_name"] = cpu
            else:
                result = subprocess.run(
                    ["sysctl", "-n", "hw.model"], capture_output=True, text=True
                )
                info["cpu_name"] = result.stdout.strip() or "Apple Silicon"
        except:
            pass

    return info


def normalize_split_filename(filename):
    match = re.match(r"^(.*)-\d{5}-of-\d{5}\.gguf$", filename, flags=re.IGNORECASE)
    if match:
        return match.group(1) + ".gguf"
    return filename


def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, payload):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2)
    except OSError as e:
        print(f"[ERROR] Failed to create directory or write file {path}: {e}")
        raise Exception(f"Failed to save data: {e}")
    except Exception as e:
        print(f"[ERROR] Unexpected error saving JSON to {path}: {e}")
        raise


def load_profile():
    return load_json(PROFILE_PATH)


def save_profile(input_data):
    print(f"[INFO] Saving profile with data: {input_data}")
    existing = load_profile() or {}
    profile = {
        "id": existing.get("id", "default"),
        "name": input_data.get("name", existing.get("name")),
        "preferred_categories": input_data.get(
            "preferred_categories", existing.get("preferred_categories", [])
        ),
        "experience_level": input_data.get(
            "experience_level", existing.get("experience_level", "novice")
        ),
        "response_style": input_data.get(
            "response_style", existing.get("response_style", "concise")
        ),
        "units": input_data.get("units", existing.get("units", "metric")),
        "language": input_data.get("language", existing.get("language")),
        "created_at": existing.get("created_at", now_iso()),
        "updated_at": now_iso(),
    }
    print(f"[INFO] Profile to save: {profile}")
    print(f"[INFO] Saving to path: {PROFILE_PATH}")
    save_json(PROFILE_PATH, profile)
    print(f"[INFO] Profile saved successfully")
    return profile


def create_chat(title=None, chat_id=None):
    chat_id = (
        chat_id
        or f"chat_{int(datetime.datetime.utcnow().timestamp())}_{secrets.token_hex(4)}"
    )
    payload = {
        "id": chat_id,
        "title": title or "New chat",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "messages": [],
        "category_lock": None,
        "model_id": None,
    }
    save_json(os.path.join(CHATS_DIR, f"{chat_id}.json"), payload)
    return payload


def load_chat(chat_id):
    return load_json(os.path.join(CHATS_DIR, f"{chat_id}.json"))


def save_chat(chat):
    chat["updated_at"] = now_iso()
    save_json(os.path.join(CHATS_DIR, f"{chat['id']}.json"), chat)
    return chat


def delete_chat(chat_id):
    path = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return True
    return False


def list_chats():
    chats = []
    try:
        for filename in os.listdir(CHATS_DIR):
            if not filename.endswith(".json"):
                continue
            chat = load_json(os.path.join(CHATS_DIR, filename))
            if not chat:
                continue
            chats.append(
                {
                    "id": chat.get("id"),
                    "title": chat.get("title", "New chat"),
                    "created_at": chat.get("created_at", ""),
                    "updated_at": chat.get("updated_at", ""),
                    "message_count": len(chat.get("messages", [])),
                    "category_lock": chat.get("category_lock"),
                }
            )
    except Exception:
        return []
    chats.sort(key=lambda c: c.get("updated_at", ""), reverse=True)
    return chats


def classify_message(message):
    text = (message or "").lower()
    keywords = {
        "medical": [
            "medical",
            "symptom",
            "diagnosis",
            "prescription",
            "dosage",
            "treatment",
            "injury",
            "blood",
            "pain",
            "infection",
            "fever",
            "wound",
        ],
        "coding": [
            "code",
            "bug",
            "error",
            "stack trace",
            "compile",
            "function",
            "variable",
            "class",
            "python",
            "javascript",
            "typescript",
            "node",
            "react",
            "api",
        ],
        "mathematics": [
            "solve",
            "equation",
            "integral",
            "derivative",
            "calculus",
            "algebra",
            "matrix",
            "probability",
            "theorem",
            "proof",
        ],
        "chemistry": [
            "molecule",
            "compound",
            "reaction",
            "molar",
            "stoichiometry",
            "acid",
            "base",
            "ph",
            "lab",
            "chemical",
        ],
        "survival": [
            "shelter",
            "fire",
            "signal",
            "rescue",
            "water",
            "food",
            "wilderness",
            "hypothermia",
            "lost",
            "survival",
        ],
        "building": [
            "repair",
            "construction",
            "tool",
            "wiring",
            "carpentry",
            "plumbing",
            "build",
            "blueprint",
        ],
        "planting": [
            "soil",
            "seed",
            "garden",
            "planting",
            "harvest",
            "crop",
            "irrigation",
            "fertilizer",
        ],
    }

    scores = {key: 0 for key in keywords}
    for key, terms in keywords.items():
        for term in terms:
            if term in text:
                scores[key] += 1

    math_signal = re.search(r"[0-9]+\s*[\+\-\*/=^]", text)
    if math_signal:
        scores["mathematics"] += 1

    top_category, top_score = max(scores.items(), key=lambda item: item[1])
    sorted_scores = sorted(scores.values(), reverse=True)
    second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0

    if top_score == 0:
        return "general", 0.2

    confidence = 0.6
    if top_score >= 3:
        confidence = 0.85
    elif top_score == 2:
        confidence = 0.75

    if second_score > 0 and top_score / max(second_score, 1) < 1.5:
        confidence -= 0.1

    confidence = max(0.2, min(0.95, confidence))
    return top_category, confidence


TOOLS_ROOT = BASE_DIR
TOOL_ALLOWLIST = {"python3", "pytest", "npm", "node", "tsc", "eslint", "vite", "pip"}
PATH_DENYLIST_SEGMENTS = {
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
}
PATH_DENYLIST_BASENAMES = {
    ".npmrc",
    ".pypirc",
    ".netrc",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "id_dsa",
    "authorized_keys",
    "known_hosts",
}
PATH_DENYLIST_PREFIXES = (".env",)


def _split_path_parts(path):
    normalized = os.path.normpath(path).replace("\\", os.sep)
    drive, tail = os.path.splitdrive(normalized)
    parts = [part for part in tail.split(os.sep) if part and part != os.curdir]
    if drive:
        parts.insert(0, drive)
    return parts


def is_denied_path(path):
    if not path:
        return False
    if "\x00" in path:
        return True
    parts = _split_path_parts(path)
    for part in parts:
        lowered = part.lower()
        if lowered in PATH_DENYLIST_SEGMENTS:
            return True
        if lowered in PATH_DENYLIST_BASENAMES:
            return True
        if lowered.startswith(PATH_DENYLIST_PREFIXES):
            return True
    return False


def validate_root(root):
    root_abs = os.path.abspath(root or TOOLS_ROOT)
    if not os.path.isdir(root_abs):
        raise ValueError("Invalid root path")
    if is_denied_path(root_abs):
        raise ValueError("Path is not allowed")
    return root_abs


def safe_path(root, rel_path):
    root_abs = validate_root(root or TOOLS_ROOT)
    if rel_path is None or rel_path == "":
        return root_abs
    if os.path.isabs(rel_path):
        candidate = os.path.abspath(rel_path)
    else:
        rel_path = rel_path.lstrip("/\\")
        candidate = os.path.abspath(os.path.join(root_abs, rel_path))
    try:
        common = os.path.commonpath([root_abs, candidate])
    except ValueError:
        raise ValueError("Invalid path")
    if common != root_abs:
        raise ValueError("Invalid path")
    if is_denied_path(candidate):
        raise ValueError("Path is not allowed")
    return candidate


def list_dir(rel_path=None, root=None):
    target = safe_path(root or TOOLS_ROOT, rel_path or "")
    entries = []
    for name in sorted(os.listdir(target)):
        full = os.path.join(target, name)
        if is_denied_path(full):
            continue
        # Return just the name as a string to match the Rust server format
        entries.append(name)
    return entries


def read_file(rel_path, max_bytes=200_000, root=None):
    target = safe_path(root or TOOLS_ROOT, rel_path)
    if not os.path.isfile(target):
        raise ValueError("File not found")
    with open(target, "rb") as f:
        content = f.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise ValueError("File too large")
    return content.decode("utf-8", errors="replace")


def atomic_write_text(target, content):
    directory = os.path.dirname(target)
    os.makedirs(directory, exist_ok=True)
    filename = os.path.basename(target)
    temp_name = f".{filename}.tmp-{secrets.token_hex(4)}"
    temp_path = os.path.join(directory, temp_name)
    with open(temp_path, "w", encoding="utf-8", newline="") as handle:
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp_path, target)
    try:
        dir_fd = os.open(directory, os.O_DIRECTORY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except Exception:
        pass


def write_file(rel_path, content, root=None):
    if content is None:
        raise ValueError("Missing content")
    if not isinstance(content, str):
        raise ValueError("Content must be text")
    target = safe_path(root or TOOLS_ROOT, rel_path)
    atomic_write_text(target, content)
    return {"path": target, "bytes": len(content.encode("utf-8"))}


def edit_file(rel_path, content, expected_sha256=None, root=None):
    current = read_file(rel_path, root=root)
    if expected_sha256:
        digest = hashlib.sha256(current.encode("utf-8")).hexdigest()
        if digest != expected_sha256:
            raise ValueError("File changed since last read")
    return write_file(rel_path, content, root=root)


def delete_file(rel_path, root=None):
    target = safe_path(root or TOOLS_ROOT, rel_path)
    if not os.path.isfile(target):
        raise ValueError("File not found")
    os.remove(target)
    return {"path": target}


def run_command(command, cwd=None, root=None):
    parts = shlex.split(command)
    if not parts:
        raise ValueError("Empty command")
    if parts[0] not in TOOL_ALLOWLIST:
        raise ValueError("Command not allowed")
    workdir = safe_path(root or TOOLS_ROOT, cwd or "")
    result = subprocess.run(
        parts,
        cwd=workdir,
        capture_output=True,
        text=True,
        timeout=120,
    )
    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def pick_folder():
    """
    Opens a dialog for the user to select a directory.

    Returns:
        str: Selected directory path, or '.' if tkinter is not available
    """
    if TKINTER_AVAILABLE:
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()  # Hide the main window
            root.attributes("-topmost", True)  # Make dialog stay on top
            folder_path = filedialog.askdirectory()
            root.destroy()
            return folder_path if folder_path else "."
        except Exception:
            print("[WARNING] Failed to open folder picker dialog, using default path")
            return "."
    else:
        return "."


def pick_file():
    """
    Opens a dialog for the user to select a file.

    Returns:
        str: Selected file path, or '.' if tkinter is not available
    """
    if TKINTER_AVAILABLE:
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()  # Hide the main window
            root.attributes("-topmost", True)  # Make dialog stay on top
            file_path = filedialog.askopenfilename()
            root.destroy()
            return file_path if file_path else "."
        except Exception:
            print("[WARNING] Failed to open file picker dialog, using default path")
            return "."
    else:
        return "."


def get_models():
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    manifest_path = os.path.join(models_dir, "manifest.json")

    try:
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
    except Exception:
        return []

    available_files = set()
    try:
        for filename in os.listdir(models_dir):
            if filename.lower().endswith(".gguf"):
                available_files.add(filename)
                available_files.add(normalize_split_filename(filename))
    except Exception:
        pass

    models = []
    seen_ids = set()
    for model in manifest:
        model_id = model.get("id")
        if model_id in seen_ids:
            continue
        seen_ids.add(model_id)
        filename = model.get("filename")
        available = bool(filename and filename in available_files)
        entry = dict(model)
        entry["available"] = available
        models.append(entry)

    return models


def load_manifest():
    candidates = [
        os.path.join(MODELS_DIR, "manifest.json"),
        os.path.join(BASE_DIR, "models", "manifest.json"),
        os.path.join(BASE_DIR, "..", "models", "manifest.json"),
    ]
    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r") as handle:
                return json.load(handle)
        except Exception as exc:
            print(f"[ERROR] Failed to read manifest {path}: {exc}")
            return []
    return []


def get_model_info(model_id):
    for model in load_manifest():
        if model.get("id") == model_id:
            return model
    return None


def get_platform_string():
    os_name = platform.system().lower()
    arch = platform.machine().lower()
    if os_name.startswith("win") and arch in ("amd64", "x86_64"):
        return "win-x64"
    if os_name.startswith("win") and arch in ("arm64", "aarch64"):
        return "win-arm64"
    if os_name == "darwin" and arch == "x86_64":
        return "mac-x64"
    if os_name == "darwin" and arch in ("arm64", "aarch64"):
        return "mac-arm64"
    if os_name.startswith("linux") and arch == "x86_64":
        return "linux-x64"
    if os_name.startswith("linux") and arch in ("arm64", "aarch64"):
        return "linux-arm64"
    return f"{os_name}-{arch}"


def find_llama_binary():
    binary_name = (
        "llama-server.exe" if sys.platform.startswith("win") else "llama-server"
    )
    platform_dir = get_platform_string()
    candidates = [
        os.path.join(RUNTIME_DIR, platform_dir, binary_name),
        os.path.join(BASE_DIR, "..", "runtime", platform_dir, binary_name),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    resolved = shutil.which("llama-server")
    if resolved:
        return resolved
    raise FileNotFoundError(
        f"Unable to locate llama-server binary for platform '{platform_dir}'. "
        "Expected it under runtime/<platform>/llama-server or on PATH."
    )


def resolve_model_path(filename):
    if not filename:
        raise FileNotFoundError("Model filename is empty")
    candidate = os.path.join(MODELS_DIR, filename)
    if os.path.exists(candidate):
        return candidate
    base, ext = os.path.splitext(filename)
    pattern = os.path.join(MODELS_DIR, f"{base}-?????-of-?????{ext}")
    matches = sorted(glob.glob(pattern))
    if matches:
        return matches[0]
    raise FileNotFoundError(
        f"Model file '{filename}' not found in {MODELS_DIR}. Download or place the GGUF file first."
    )


def _refresh_llm_process_state():
    global _llm_process
    if _llm_process and _llm_process.poll() is not None:
        print("[INFO] Detected stopped llama-server process; clearing state.")
        _llm_process = None
        llm_state.update({"running": False, "model_id": None, "category": None})


def _stop_llama_process_locked():
    global _llm_process
    if not _llm_process:
        llm_state.update({"running": False, "model_id": None, "category": None})
        return
    print("[INFO] Stopping llama-server process...")
    try:
        if _llm_process.poll() is None:
            _llm_process.terminate()
            try:
                _llm_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(
                    "[WARN] llama-server did not exit gracefully; forcing termination."
                )
                _llm_process.kill()
                _llm_process.wait(timeout=5)
    finally:
        _llm_process = None
        llm_state.update({"running": False, "model_id": None, "category": None})


def stop_llama_server():
    with _LLM_LOCK:
        _refresh_llm_process_state()
        _stop_llama_process_locked()


def start_llama_server(model_id, ctx_size=None, threads=None, gpu_layers=None):
    model = get_model_info(model_id)
    if not model:
        raise ValueError(f"Model '{model_id}' not found in manifest")
    try:
        model_path = resolve_model_path(model.get("filename"))
    except FileNotFoundError as exc:
        raise FileNotFoundError(str(exc))

    binary_path = find_llama_binary()
    log_dir = os.path.join(DATA_DIR, "logs")
    os.makedirs(log_dir, exist_ok=True)

    ctx = int(ctx_size or model.get("recommended_ctx") or 4096)
    thread_count = int(threads or os.cpu_count() or 4)
    gpu_layers_value = int(gpu_layers) if gpu_layers else 0

    env = os.environ.copy()
    runtime_dir = os.path.dirname(binary_path)
    try:
        os.chmod(binary_path, 0o755)
    except Exception:
        pass

    if sys.platform == "darwin":
        existing = env.get("DYLD_LIBRARY_PATH", "")
        env["DYLD_LIBRARY_PATH"] = (
            f"{runtime_dir}:{existing}" if existing else runtime_dir
        )
    elif sys.platform.startswith("linux"):
        existing = env.get("LD_LIBRARY_PATH", "")
        env["LD_LIBRARY_PATH"] = (
            f"{runtime_dir}:{existing}" if existing else runtime_dir
        )
    elif sys.platform.startswith("win"):
        existing = env.get("PATH", "")
        env["PATH"] = f"{runtime_dir};{existing}" if existing else runtime_dir

    cmd = [
        binary_path,
        "--model",
        model_path,
        "--host",
        "127.0.0.1",
        "--port",
        str(LLAMA_PORT),
        "--ctx-size",
        str(ctx),
        "--threads",
        str(max(1, thread_count)),
    ]
    if gpu_layers_value > 0:
        cmd.extend(["--n-gpu-layers", str(gpu_layers_value)])

    log_path = os.path.join(log_dir, "llama-server.log")
    log_header = (
        f"\n[{datetime.datetime.utcnow().isoformat()}Z] Starting model {model_id} "
        f"using binary {binary_path}\n"
    )

    with _LLM_LOCK:
        _refresh_llm_process_state()
        _stop_llama_process_locked()
        print(f"[INFO] Launching llama-server for model '{model_id}' from {model_path}")
        try:
            with open(log_path, "ab") as log_file:
                log_file.write(log_header.encode("utf-8", errors="ignore"))
                log_file.flush()
                process = subprocess.Popen(
                    cmd,
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    env=env,
                )
        except Exception as exc:
            raise RuntimeError(f"Failed to start llama-server: {exc}")

        global _llm_process
        _llm_process = process
        llm_state.update(
            {
                "running": True,
                "model_id": model_id,
                "category": model.get("category"),
                "port": LLAMA_PORT,
            }
        )
        print("[INFO] llama-server started successfully")


def load_specialized_content():
    paths = [
        os.path.join(DATA_DIR, "specialized_content.json"),
        os.path.join(BASE_DIR, "data", "specialized_content.json"),
        os.path.join(BASE_DIR, "..", "data", "specialized_content.json"),
    ]
    for path in paths:
        if not os.path.exists(path):
            continue
        try:
            mtime = os.path.getmtime(path)
            if (
                _specialized_cache["data"] is not None
                and _specialized_cache["path"] == path
                and _specialized_cache["mtime"] == mtime
            ):
                return _specialized_cache["data"]
            with open(path, "r") as handle:
                data = json.load(handle)
            _specialized_cache["path"] = path
            _specialized_cache["mtime"] = mtime
            _specialized_cache["data"] = data
            return data
        except Exception as exc:
            print(f"[WARN] Failed to load specialized content from {path}: {exc}")
            return None
    return None


def find_specialized_response(category, message):
    content = load_specialized_content()
    if not content or not message:
        return None
    msg_lower = message.lower()
    is_urgent = any(
        term in msg_lower for term in ["urgent", "emergency", "quick", "now", "help"]
    )
    is_primitive = any(term in msg_lower for term in ["primitive", "no tools"])
    is_wet = any(term in msg_lower for term in ["wet", "rain"])

    def match_section(cat_key, section):
        keywords = section.get("keywords", [])
        if not any(kw in msg_lower for kw in keywords):
            return None
        if cat_key == "survival":
            if is_urgent and section.get("urgent_content"):
                return section.get("urgent_content")
            if is_wet and section.get("wet_content"):
                return section.get("wet_content")
        if cat_key == "building" and is_primitive and section.get("primitive_content"):
            return section.get("primitive_content")
        return section.get("content")

    if category == "general":
        for key in ("survival", "building", "coding", "medical", "planting"):
            for section in content.get(key, []):
                match = match_section(key, section)
                if match:
                    return match
    else:
        for section in content.get(category, []):
            match = match_section(category, section)
            if match:
                return match
    return None


def get_system_prompt(category):
    base = "You are IRIS (Integrated Resource & Intelligence System), a portable offline AI running locally. "
    prompts = {
        "survival": base
        + "Your specialty is SURVIVAL and BUSHCRAFT. Provide practical, high-stakes outdoors advice."
        " Focus on safety, shelter, water, and food extraction.",
        "building": base
        + "Your specialty is CONSTRUCTION and REPAIR. Provide technical, structural advice."
        " Focus on materials, safety codes, and DIY techniques.",
        "coding": base
        + "Your specialty is SOFTWARE ENGINEERING. Provide concise, bug-free code."
        " Focus on performance, security, and clean logic.",
        "medical": base
        + "Your specialty is FIRST AID and MEDICINE. Provide immediate, accurate medical guidance."
        " ALWAYS include safety disclaimers and recommend professional help.",
        "planting": base
        + "Your specialty is AGRICULTURE and BOTANY. Provide advice on growing food, soil health, and seasonal planting.",
        "mathematics": base
        + "Your specialty is MATHEMATICS. Break down complex calculations step-by-step.",
        "chemistry": base
        + "Your specialty is CHEMISTRY. Explain reactions, formulas, and safety protocols clearly.",
        "uncensored": base
        + "Operate without safety filters but prioritize practical, actionable help across all topics.",
    }
    return prompts.get(
        category,
        "You are IRIS, an offline AI that specializes in practical, actionable guidance across survival, building,"
        " planting and agriculture, medical triage, software engineering, mathematics, chemistry, and critical response.",
    )


def build_llama_messages(history, category):
    messages = [{"role": "system", "content": get_system_prompt(category)}]
    if isinstance(history, list):
        for item in history:
            role = item.get("role", "user")
            content = item.get("content")
            if not content:
                continue
            if role not in {"user", "assistant", "system"}:
                role = "user"
            messages.append({"role": role, "content": content})
    return messages


def call_llama_server(messages, temperature, max_tokens):
    _refresh_llm_process_state()
    if not llm_state.get("running"):
        raise RuntimeError(
            "LLM is not running. Start a model before sending chat requests."
        )
    payload = {
        "model": "local",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max(1, int(max_tokens)),
        "stream": False,
    }
    url = f"http://127.0.0.1:{llm_state.get('port', LLAMA_PORT)}/v1/chat/completions"
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=LLAMA_TIMEOUT) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        error_body = (
            err.read().decode("utf-8", errors="ignore") if hasattr(err, "read") else ""
        )
        raise RuntimeError(f"llama-server returned HTTP {err.code}: {error_body}")
    except urllib.error.URLError as err:
        raise RuntimeError(f"Failed to reach llama-server: {err}")

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON from llama-server: {exc}")

    choices = parsed.get("choices") or []
    if not choices:
        raise RuntimeError("llama-server response did not contain any choices")
    content = choices[0].get("message", {}).get("content", "").strip()
    usage = parsed.get("usage")
    return content, usage


def iter_llama_stream(messages, temperature, max_tokens):
    _refresh_llm_process_state()
    if not llm_state.get("running"):
        raise RuntimeError(
            "LLM is not running. Start a model before sending chat requests."
        )
    payload = {
        "model": "local",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max(1, int(max_tokens)),
        "stream": True,
    }
    url = f"http://127.0.0.1:{llm_state.get('port', LLAMA_PORT)}/v1/chat/completions"
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    try:
        response = urllib.request.urlopen(request, timeout=LLAMA_TIMEOUT)
    except urllib.error.HTTPError as err:
        error_body = (
            err.read().decode("utf-8", errors="ignore") if hasattr(err, "read") else ""
        )
        raise RuntimeError(f"llama-server returned HTTP {err.code}: {error_body}")
    except urllib.error.URLError as err:
        raise RuntimeError(f"Failed to reach llama-server: {err}")

    for raw_line in response:
        line = raw_line.decode("utf-8", errors="ignore").strip()
        if not line or not line.startswith("data:"):
            continue
        payload_text = line[5:].strip()
        if payload_text == "[DONE]":
            break
        try:
            parsed = json.loads(payload_text)
        except json.JSONDecodeError:
            continue
        choices = parsed.get("choices") or []
        if not choices:
            continue
        delta = choices[0].get("delta", {}).get("content")
        if not delta:
            delta = choices[0].get("message", {}).get("content")
        if delta:
            yield delta


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/profile":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body) if body else {}
                profile = save_profile(data)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"profile": profile}).encode())
            except json.JSONDecodeError as e:
                print(f"[ERROR] Invalid JSON in profile request: {e}")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON format"}).encode())
            except Exception as e:
                print(f"[ERROR] Failed to save profile: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"error": f"Failed to save profile: {str(e)}"}).encode()
                )

        elif self.path == "/api/chats":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            chat = create_chat(title=data.get("title"))

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"chat": chat}).encode())

        elif self.path.startswith("/api/chats/"):
            parts = self.path.split("/")
            chat_id = parts[3] if len(parts) > 3 else None
            if not chat_id:
                self.send_error(400, "Chat ID required")
                return
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            chat = load_chat(chat_id)
            if not chat:
                self.send_error(404, "Chat not found")
                return
            if "title" in data:
                chat["title"] = data.get("title") or chat.get("title")
            if "category_lock" in data:
                chat["category_lock"] = data.get("category_lock")
            save_chat(chat)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"chat": chat}).encode())

        elif self.path == "/api/classify":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            category, confidence = classify_message(data.get("message", ""))

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(
                json.dumps({"category": category, "confidence": confidence}).encode()
            )

        elif self.path == "/api/tools/execute":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            tool = data.get("tool")
            root = data.get("root") or data.get("sandbox_root") or TOOLS_ROOT
            try:
                if tool == "list_dir":
                    result = list_dir(data.get("path"), root=root)
                elif tool == "read_file":
                    result = {"content": read_file(data.get("path"), root=root)}
                elif tool == "write_file":
                    result = write_file(
                        data.get("path"), data.get("content"), root=root
                    )
                elif tool == "edit_file":
                    result = edit_file(
                        data.get("path"),
                        data.get("content"),
                        expected_sha256=data.get("expected_sha256"),
                        root=root,
                    )
                elif tool == "delete_file":
                    result = delete_file(data.get("path"), root=root)
                elif tool == "run_command":
                    result = run_command(
                        data.get("command", ""), data.get("cwd"), root=root
                    )
                elif tool == "pick_folder":
                    result = pick_folder()
                elif tool == "pick_file":
                    result = pick_file()
                else:
                    raise ValueError("Unknown tool")
                payload = {"success": True, "result": result}
                self.send_response(200)
            except Exception as err:
                payload = {"success": False, "error": str(err)}
                self.send_response(400)

            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        elif self.path == "/api/llm/start":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode())
                return

            model_id = data.get("model_id")
            if not model_id:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {"error": "model_id is required", "success": False}
                    ).encode()
                )
                return

            try:
                start_llama_server(
                    model_id,
                    ctx_size=data.get("ctx"),
                    threads=data.get("threads"),
                    gpu_layers=data.get("gpu_layers"),
                )
                payload = {
                    "success": True,
                    "model_id": model_id,
                    "message": f"Started model '{model_id}'",
                }
                status_code = 200
            except (ValueError, FileNotFoundError) as exc:
                payload = {"success": False, "error": str(exc)}
                status_code = 400
            except RuntimeError as exc:
                payload = {"success": False, "error": str(exc)}
                status_code = 500

            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        elif self.path == "/api/llm/stop":
            try:
                stop_llama_server()
                payload = {"success": True, "message": "LLM stopped"}
                status_code = 200
            except Exception as exc:
                payload = {"success": False, "error": str(exc)}
                status_code = 500

            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        elif self.path == "/api/chat":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode())
                return

            chat_id = data.get("chat_id")
            history = data.get("messages")
            message_text = data.get("message")
            if not message_text and isinstance(history, list) and history:
                last_entry = history[-1] or {}
                message_text = last_entry.get("content", "")
            raw_message = (message_text or "").strip()
            if not raw_message:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "message is required"}).encode())
                return

            category_value = (
                data.get("category") or llm_state.get("category") or "general"
            )
            category = str(category_value).lower()

            try:
                temperature = float(data.get("temperature", 0.7))
            except (TypeError, ValueError):
                temperature = 0.7
            temperature = max(0.0, min(2.0, temperature))

            try:
                max_tokens = int(data.get("max_tokens", 512))
            except (TypeError, ValueError):
                max_tokens = 512
            max_tokens = max(32, max_tokens)

            history_payload = history if isinstance(history, list) else []
            if not history_payload:
                history_payload = [{"role": "user", "content": raw_message}]

            specialized_response = find_specialized_response(category, raw_message)
            usage = None
            source = "specialized" if specialized_response else "llama"

            if specialized_response:
                assistant_content = specialized_response
            else:
                if not llm_state.get("running"):
                    self.send_response(503)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps({"error": "LLM is not running"}).encode()
                    )
                    return
                try:
                    assistant_content, usage = call_llama_server(
                        build_llama_messages(history_payload, category),
                        temperature,
                        max_tokens,
                    )
                except RuntimeError as exc:
                    self.send_response(503)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": str(exc)}).encode())
                    return

            chat = load_chat(chat_id) if chat_id else None
            if not chat:
                chat = create_chat(chat_id=chat_id)
                chat_id = chat["id"]

            chat_messages = chat.setdefault("messages", [])
            timestamp = now_iso()
            user_payload = {
                "role": "user",
                "content": raw_message,
                "timestamp": timestamp,
                "category": category,
            }
            assistant_payload = {
                "role": "assistant",
                "content": assistant_content,
                "timestamp": now_iso(),
                "category": category,
            }
            chat_messages.append(user_payload)
            chat_messages.append(assistant_payload)
            if chat.get("title") == "New chat" and len(chat_messages) <= 2:
                chat["title"] = " ".join(raw_message.split()[:6]) or "New chat"
            save_chat(chat)

            response_payload = {
                "response": assistant_content,
                "content": assistant_content,
                "category": category,
                "chat_id": chat_id,
                "usage": usage,
                "source": source,
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode())
        elif self.path == "/api/chat/stream":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode())
                return

            chat_id = data.get("chat_id")
            history = data.get("messages")
            message_text = data.get("message")
            if not message_text and isinstance(history, list) and history:
                last_entry = history[-1] or {}
                message_text = last_entry.get("content", "")
            raw_message = (message_text or "").strip()
            if not raw_message:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "message is required"}).encode())
                return

            category_value = (
                data.get("category") or llm_state.get("category") or "general"
            )
            category = str(category_value).lower()

            try:
                temperature = float(data.get("temperature", 0.7))
            except (TypeError, ValueError):
                temperature = 0.7
            temperature = max(0.0, min(2.0, temperature))

            try:
                max_tokens = int(data.get("max_tokens", 512))
            except (TypeError, ValueError):
                max_tokens = 512
            max_tokens = max(32, max_tokens)

            history_payload = history if isinstance(history, list) else []
            if not history_payload:
                history_payload = [{"role": "user", "content": raw_message}]

            chat = load_chat(chat_id) if chat_id else None
            if not chat:
                chat = create_chat(chat_id=chat_id)
                chat_id = chat["id"]

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            specialized_response = find_specialized_response(category, raw_message)
            assistant_content = ""
            source = "specialized" if specialized_response else "llama"

            def emit_event(payload):
                self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode("utf-8"))
                self.wfile.flush()

            emit_event({"event": "start", "chat_id": chat_id, "source": source})

            if specialized_response:
                assistant_content = specialized_response
                emit_event({"event": "delta", "delta": assistant_content})
            else:
                try:
                    for chunk in iter_llama_stream(
                        build_llama_messages(history_payload, category),
                        temperature,
                        max_tokens,
                    ):
                        assistant_content += chunk
                        emit_event({"event": "delta", "delta": chunk})
                except RuntimeError as exc:
                    emit_event({"event": "error", "error": str(exc)})
                    return

            chat_messages = chat.setdefault("messages", [])
            timestamp = now_iso()
            user_payload = {
                "role": "user",
                "content": raw_message,
                "timestamp": timestamp,
                "category": category,
            }
            assistant_payload = {
                "role": "assistant",
                "content": assistant_content,
                "timestamp": now_iso(),
                "category": category,
            }
            chat_messages.append(user_payload)
            chat_messages.append(assistant_payload)
            if chat.get("title") == "New chat" and len(chat_messages) <= 2:
                chat["title"] = " ".join(raw_message.split()[:6]) or "New chat"
            save_chat(chat)

            emit_event({"event": "done", "chat_id": chat_id, "source": source})
            return
        elif self.path == "/api/benchmark":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            model_id = data.get("model_id", "unknown")

            # Simulate benchmark (in real implementation, this would run llama.cpp)
            import time
            import random

            time.sleep(1.5)  # Simulate processing

            result = {
                "tokens_per_second": round(random.uniform(8, 25), 1),
                "time_to_first_token_ms": round(random.uniform(100, 500), 0),
                "total_time_ms": round(random.uniform(1500, 3000), 0),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unknown endpoint"}).encode())

    def do_GET(self):
        # API endpoints
        if self.path == "/api/profile":
            profile = load_profile()
            payload = {"exists": bool(profile), "profile": profile}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())
        elif self.path == "/api/tools":
            payload = {
                "tools": [
                    {"id": "list_dir", "description": "List directory contents"},
                    {"id": "read_file", "description": "Read a text file"},
                    {"id": "write_file", "description": "Write a text file"},
                    {"id": "edit_file", "description": "Edit a text file"},
                    {"id": "delete_file", "description": "Delete a file"},
                    {"id": "run_command", "description": "Run an allowed command"},
                    {
                        "id": "pick_folder",
                        "description": "Select a folder using a file dialog",
                    },
                    {
                        "id": "pick_file",
                        "description": "Select a file using a file dialog",
                    },
                ],
                "allowlist": sorted(list(TOOL_ALLOWLIST)),
                "denylist": {
                    "segments": sorted(list(PATH_DENYLIST_SEGMENTS)),
                    "basenames": sorted(list(PATH_DENYLIST_BASENAMES)),
                    "prefixes": list(PATH_DENYLIST_PREFIXES),
                },
                "root": TOOLS_ROOT,
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())
        elif self.path == "/api/chats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"chats": list_chats()}).encode())
        elif self.path.startswith("/api/chats/"):
            parts = self.path.split("/")
            chat_id = parts[3] if len(parts) > 3 else None
            chat = load_chat(chat_id) if chat_id else None
            if not chat:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Chat not found"}).encode())
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"chat": chat}).encode())
        elif self.path == "/api/system_info":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(get_system_info()).encode())
        elif self.path == "/api/models":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(get_models()).encode())
        elif self.path in ("/api/llm_status", "/api/llm/status"):
            _refresh_llm_process_state()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(llm_state).encode())
        elif self.path == "/api/system/capabilities":
            # Return system capabilities - models grouped by category with availability
            models = get_models()
            system_info = get_system_info()

            # Group models by category
            categories = {}
            for model in models:
                cat = model.get("category", "general")
                if cat not in categories:
                    categories[cat] = {"available": [], "unavailable": []}
                if model.get("available", False):
                    categories[cat]["available"].append(
                        {
                            "id": model.get("id"),
                            "name": model.get("display_name", model.get("id")),
                            "min_ram": model.get("min_ram_gb", 0),
                            "uncensored": model.get("uncensored", False),
                        }
                    )
                else:
                    categories[cat]["unavailable"].append(
                        {
                            "id": model.get("id"),
                            "name": model.get("display_name", model.get("id")),
                            "min_ram": model.get("min_ram_gb", 0),
                        }
                    )

            # Summary stats
            total_models = len(models)
            available_models = sum(1 for m in models if m.get("available", False))
            total_categories = len(categories)

            result = {
                "system": {
                    "cpu": system_info.get("cpu_name", "Unknown"),
                    "ram_gb": system_info.get("ram_total_gb", 0),
                    "gpu": system_info.get("gpu"),
                    "os": system_info.get("os", "Unknown"),
                },
                "categories": categories,
                "summary": {
                    "total_models": total_models,
                    "available_models": available_models,
                    "total_categories": total_categories,
                },
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            # Serve static files
            self.serve_static_file()

    def serve_static_file(self):
        """Serve static files from the static directory."""
        # Parse path and handle URL encoding
        path = unquote(self.path)

        # Remove query string if present
        if "?" in path:
            path = path.split("?")[0]

        # Default to index.html for root path
        if path == "/" or path == "":
            path = "/index.html"

        # Construct full file path
        file_path = os.path.join(STATIC_DIR, path.lstrip("/"))

        # Security: prevent directory traversal
        file_path = os.path.normpath(file_path)
        if not file_path.startswith(os.path.normpath(STATIC_DIR)):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b"Forbidden")
            return

        # Check if file exists
        if os.path.isfile(file_path):
            try:
                # Determine content type
                content_type, _ = mimetypes.guess_type(file_path)
                if content_type is None:
                    content_type = "application/octet-stream"

                # Read and serve the file
                with open(file_path, "rb") as f:
                    content = f.read()

                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f"Error reading file: {e}".encode())
        elif os.path.isdir(file_path):
            # Try to serve index.html from directory
            index_path = os.path.join(file_path, "index.html")
            if os.path.isfile(index_path):
                self.path = path.rstrip("/") + "/index.html"
                self.serve_static_file()
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Not Found")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def do_DELETE(self):
        if self.path.startswith("/api/chats/"):
            parts = self.path.split("/")
            chat_id = parts[3] if len(parts) > 3 else None
            if not chat_id:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Chat ID required"}).encode())
                return
            deleted = delete_chat(chat_id)
            if not deleted:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Chat not found"}).encode())
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())
            return

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress logs


if __name__ == "__main__":
    print("=" * 50)
    print("   IRIS - Heritage UI Backend Server")
    print("=" * 50)
    print(f"")
    print(f"[INFO] Static files: {STATIC_DIR}")
    print(f"[INFO] Starting server on port {PORT}...")
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[INFO] Server running at http://127.0.0.1:{PORT}")
    print(f"")
    print("API Endpoints:")
    print(f"  GET  /api/models      - List available models")
    print(f"  GET  /api/profile     - Load profile")
    print(f"  POST /api/profile     - Save profile")
    print(f"  GET  /api/tools       - List tools")
    print(f"  POST /api/tools/execute - Run tool")
    print(f"  GET  /api/chats       - List chats")
    print(f"  POST /api/chats       - Create chat")
    print(f"  GET  /api/chats/:id   - Load chat")
    print(f"  POST /api/chats/:id   - Update chat")
    print(f"  DELETE /api/chats/:id - Delete chat")
    print(f"  POST /api/classify    - Classify message")
    print(f"  GET  /api/llm/status  - Get LLM status")
    print(f"  POST /api/chat        - Send chat message")
    print(f"  POST /api/llm/start   - Start LLM")
    print(f"  POST /api/llm/stop    - Stop LLM")
    print(f"")
    print("Press Ctrl+C to stop the server.")
    print("=" * 50)
    server.serve_forever()
