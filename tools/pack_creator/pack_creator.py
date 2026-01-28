#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, NoReturn, Optional


SCHEMA_VERSION_FIRMWARE = 1
SCHEMA_VERSION_LANGUAGE = 1


def die(message: str, code: int = 1) -> NoReturn:
    print(f"[pack-creator] {message}", file=sys.stderr)
    sys.exit(code)


def ensure_no_symlinks(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_symlink():
            die(f"Symlinks are not allowed: {path}")


def is_safe_relative(path_value: str) -> bool:
    candidate = Path(path_value)
    if candidate.is_absolute():
        return False
    for part in candidate.parts:
        if part in ("..", "/"):
            return False
    return True


def compute_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        die(f"Missing file: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        die(f"Invalid JSON in {path}: {exc}")


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, sort_keys=False) + "\n", encoding="utf-8"
    )


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        die(f"Destination already exists: {dst}")
    shutil.copytree(src, dst)


def init_firmware(out_dir: Path, pack_id: str, name: str, version: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": SCHEMA_VERSION_FIRMWARE,
        "id": pack_id,
        "name": name,
        "version": version,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "description": None,
        "files": [],
        "delete": [],
    }
    write_json(out_dir / "firmware_update.json", manifest)
    (out_dir / "payload").mkdir(exist_ok=True)
    print(f"Initialized firmware pack at {out_dir}")


def init_language(
    out_dir: Path, pack_id: str, name: str, locale: str, version: str
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": SCHEMA_VERSION_LANGUAGE,
        "id": pack_id,
        "name": name,
        "locale": locale,
        "version": version,
        "description": None,
        "author": None,
        "license": None,
        "fallback_locale": None,
        "resources": [],
    }
    write_json(out_dir / "language_pack.json", manifest)
    print(f"Initialized language pack at {out_dir}")


def build_firmware(source_payload: Path, manifest_path: Path, out_dir: Path) -> None:
    if not source_payload.exists() or not source_payload.is_dir():
        die("Firmware payload directory does not exist")
    ensure_no_symlinks(source_payload)

    manifest = read_json(manifest_path)
    required = ["schema_version", "id", "name", "version", "created_at"]
    for key in required:
        if key not in manifest or not str(manifest[key]).strip():
            die(f"Manifest missing required field: {key}")

    payload_out = out_dir / "payload"
    out_dir.mkdir(parents=True, exist_ok=True)
    if payload_out.exists():
        shutil.rmtree(payload_out)
    shutil.copytree(source_payload, payload_out)

    files = []
    for path in sorted(payload_out.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(payload_out).as_posix()
        if not is_safe_relative(rel):
            die(f"Unsafe payload path: {rel}")
        files.append(
            {
                "path": rel,
                "checksum_sha256": compute_sha256(path),
            }
        )

    manifest["files"] = files
    if "delete" not in manifest:
        manifest["delete"] = []

    write_json(out_dir / "firmware_update.json", manifest)
    print(f"Firmware pack built at {out_dir}")


def build_language(pack_dir: Path, out_dir: Optional[Path]) -> None:
    source_dir = pack_dir
    if out_dir is not None:
        if out_dir.exists():
            die(f"Output directory already exists: {out_dir}")
        shutil.copytree(pack_dir, out_dir)
        source_dir = out_dir

    manifest_path = source_dir / "language_pack.json"
    manifest = read_json(manifest_path)
    required = ["schema_version", "id", "name", "locale", "version", "resources"]
    for key in required:
        if key not in manifest:
            die(f"Manifest missing required field: {key}")

    resources = manifest.get("resources") or []
    if not isinstance(resources, list):
        die("Manifest resources must be a list")

    for resource in resources:
        path_value = resource.get("path") if isinstance(resource, dict) else None
        if not isinstance(path_value, str) or not path_value:
            die("Each resource must include a path")
        if not is_safe_relative(path_value):
            die(f"Unsafe resource path: {path_value}")
        resource_path = source_dir / path_value
        if not resource_path.exists():
            die(f"Resource missing: {path_value}")
        resource["checksum_sha256"] = compute_sha256(resource_path)

    manifest["resources"] = resources
    write_json(manifest_path, manifest)
    print(f"Language pack checksums updated at {source_dir}")


def verify_firmware(pack_dir: Path) -> None:
    manifest_path = pack_dir / "firmware_update.json"
    payload_dir = pack_dir / "payload"
    manifest = read_json(manifest_path)
    files = manifest.get("files") or []
    for entry in files:
        path_value = entry.get("path") if isinstance(entry, dict) else None
        checksum = entry.get("checksum_sha256") if isinstance(entry, dict) else None
        if not isinstance(path_value, str) or not path_value or not checksum:
            die("Manifest file entries must include path and checksum_sha256")
        if not is_safe_relative(path_value):
            die(f"Unsafe path: {path_value}")
        payload_path = payload_dir / path_value
        if not payload_path.exists():
            die(f"Missing payload file: {path_value}")
        actual = compute_sha256(payload_path)
        if actual.lower() != str(checksum).lower():
            die(f"Checksum mismatch for {path_value}")
    print("Firmware pack verified")


def verify_language(pack_dir: Path) -> None:
    manifest_path = pack_dir / "language_pack.json"
    manifest = read_json(manifest_path)
    resources = manifest.get("resources") or []
    for resource in resources:
        path_value = resource.get("path") if isinstance(resource, dict) else None
        checksum = (
            resource.get("checksum_sha256") if isinstance(resource, dict) else None
        )
        if not isinstance(path_value, str) or not path_value:
            die("Resource entry missing path")
        if not is_safe_relative(path_value):
            die(f"Unsafe resource path: {path_value}")
        resource_path = pack_dir / path_value
        if not resource_path.exists():
            die(f"Resource missing: {path_value}")
        if checksum:
            actual = compute_sha256(resource_path)
            if actual.lower() != str(checksum).lower():
                die(f"Checksum mismatch for {path_value}")
    print("Language pack verified")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="pack-creator", description="USB Assistant pack creator"
    )
    subparsers = parser.add_subparsers(dest="command")

    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("type", choices=["firmware", "language"])
    init_parser.add_argument("--out", required=True)
    init_parser.add_argument("--id", required=True)
    init_parser.add_argument("--name", required=True)
    init_parser.add_argument("--version", required=True)
    init_parser.add_argument("--locale")

    build_parser = subparsers.add_parser("build")
    build_parser.add_argument("type", choices=["firmware", "language"])
    build_parser.add_argument("--source", required=True)
    build_parser.add_argument("--manifest")
    build_parser.add_argument("--out")

    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("type", choices=["firmware", "language"])
    verify_parser.add_argument("--pack", required=True)

    args = parser.parse_args()

    if args.command == "init":
        out_dir = Path(args.out)
        if args.type == "firmware":
            init_firmware(out_dir, args.id, args.name, args.version)
        else:
            if not args.locale:
                die("--locale is required for language packs")
            init_language(out_dir, args.id, args.name, args.locale, args.version)
        return

    if args.command == "build":
        if args.type == "firmware":
            if not args.manifest:
                die("--manifest is required for firmware build")
            build_firmware(
                Path(args.source),
                Path(args.manifest),
                Path(args.out or Path(args.manifest).parent),
            )
        else:
            build_language(Path(args.source), Path(args.out) if args.out else None)
        return

    if args.command == "verify":
        pack_dir = Path(args.pack)
        if args.type == "firmware":
            verify_firmware(pack_dir)
        else:
            verify_language(pack_dir)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
