# Firmware Update Packs

This document defines the offline firmware update pack format and how it is applied by the backend.

## Pack Structure

An update pack is a folder with this structure:

```
firmware-update-pack/
  firmware_update.json
  payload/
    <files to install>
```

Files in `payload/` are copied into the firmware root at `data/firmware/current/` using the same relative paths listed in the manifest.

## Manifest Format

`firmware_update.json`:

```json
{
  "schema_version": 1,
  "id": "core-firmware-2026-01-27",
  "name": "Core Firmware Update",
  "version": "1.2.0",
  "created_at": "2026-01-27T12:00:00Z",
  "description": "Fixes boot reliability and improves sensor calibration.",
  "files": [
    {
      "path": "bin/firmware.bin",
      "checksum_sha256": "<sha256 hex>"
    },
    {
      "path": "config/defaults.json",
      "checksum_sha256": "<sha256 hex>"
    }
  ],
  "delete": [
    {
      "path": "bin/legacy.bin",
      "checksum_sha256": "<optional sha256 hex>"
    }
  ]
}
```

### Field Notes

- `schema_version`: Must be `1`.
- `id`, `name`, `version`, `created_at`: Required metadata fields.
- `files`: Required entries to install. Each file path is relative to `payload/` and the firmware root.
- `delete`: Optional list of files to remove from the firmware root. If a checksum is provided, it must match the current file.

## Validation and Apply Behavior

- The server uses SHA-256 checksum verification for file integrity.
- All file paths must be safe relative paths (no absolute paths, no `..`).
- If any step fails, the server rolls back to the previous firmware state.

## Pack Creator CLI

The pack creator CLI assembles the folder structure, writes `firmware_update.json`,
and computes SHA-256 checksums for payload files.

### Basic Usage

```
python3 tools/pack_creator/pack_creator.py init firmware \
  --out ./firmware-update-pack \
  --id core-firmware-2026-01-27 \
  --name "Core Firmware Update" \
  --version 1.2.0

python3 tools/pack_creator/pack_creator.py build firmware \
  --source ./build/output \
  --manifest ./firmware-update-pack/firmware_update.json \
  --out ./firmware-update-pack

python3 tools/pack_creator/pack_creator.py verify firmware --pack ./firmware-update-pack
```

### Notes

- `build firmware` copies `--source` into `payload/` and updates `files[]` with checksums.
- Keep delete entries in the manifest if you need to remove old files.

### Security Notes

- Only add files from a trusted build output; do not include secrets, keys, or credentials.
- Always run `pack_creator.py verify firmware` before distribution to catch checksum or path issues.
- Keep pack contents immutable once published; store in a read-only location to prevent tampering.
- Use `--checksum-sha256` for delete entries to avoid removing unexpected files.
- Do not allow symlinks or paths containing `..` inside `payload/`.

## API Endpoints

- `GET /api/firmware_updates/status` - returns the most recent update record.
- `POST /api/firmware_updates/apply`
  - Body: `{ "source_path": "/path/to/firmware-update-pack" }`

The apply response includes the update record and whether it succeeded.
