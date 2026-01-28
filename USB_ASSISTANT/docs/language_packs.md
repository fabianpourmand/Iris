# Language Pack Manifest Specification

Language packs live in `data/language_packs/installed/<pack_id>` and include a
single manifest file named `language_pack.json`.

## Manifest File

Required fields:

- `schema_version` (number) - must be `1`.
- `id` (string) - unique pack id, ASCII `A-Z a-z 0-9 - _ .` only.
- `name` (string) - human readable name.
- `locale` (string) - BCP-47 style tag, ASCII `A-Z a-z 0-9 - _` only.
- `version` (string) - semantic version or release string.

Optional fields:

- `description` (string)
- `author` (string)
- `license` (string)
- `fallback_locale` (string)
- `resources` (array)

Resource entry fields:

- `id` (string) - resource identifier.
- `path` (string) - relative path inside the pack directory.
- `kind` (string) - resource type (for example `strings`, `prompts`, `voice`).
- `checksum_sha256` (string, optional) - hex digest for validation.

### Example

```json
{
  "schema_version": 1,
  "id": "en-us",
  "name": "English (US)",
  "locale": "en-US",
  "version": "1.0.0",
  "description": "Baseline English pack.",
  "author": "USB Assistant",
  "license": "CC-BY-4.0",
  "resources": [
    {
      "id": "strings",
      "path": "strings.json",
      "kind": "strings"
    }
  ]
}
```

## Validation Rules

- `id` must match the folder name under `data/language_packs/installed`.
- `path` values must be safe relative paths (no absolute paths, no `..`).
- If `checksum_sha256` is provided, it must match the file contents.

## Pack Creator CLI

The pack creator CLI builds the pack folder, writes `language_pack.json`, and
computes checksums for resources.

### Basic Usage

```
python3 tools/pack_creator/pack_creator.py init language \
  --out ./language-pack \
  --id en-us \
  --name "English (US)" \
  --locale en-US \
  --version 1.0.0

# Add resource files manually, then update checksums:
python3 tools/pack_creator/pack_creator.py build language --source ./language-pack

python3 tools/pack_creator/pack_creator.py verify language --pack ./language-pack
```

### Notes

- The CLI does not add resources automatically. List resources in `language_pack.json` and place the files in the pack folder.
- `build language` updates `resources[].checksum_sha256` in place.

### Security Notes

- Only include vetted language resources; treat packs as executable content for prompt injection risk.
- Keep resource paths inside the pack root; reject absolute paths and `..` components.
- Use `pack_creator.py verify language` before install to catch checksum drift.
- Avoid bundling private data or proprietary prompts unless distribution is controlled.
- Do not follow symlinks when building packs to prevent unintended file inclusion.

## API Endpoints

- `GET /api/language_packs` - list installed packs with validation state.
- `POST /api/language_packs/install` - install from a local folder path.
- `POST /api/language_packs/remove` - remove by id.
- `POST /api/language_packs/activate` - activate by id or clear with `null`.
