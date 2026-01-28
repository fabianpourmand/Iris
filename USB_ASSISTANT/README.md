# IRIS USB Assistant

IRIS USB is a local-first assistant that runs fully offline. It ships with a lightweight backend, a desktop UI, and a workspace explorer for on-device files.

## Quick Start

Run the launcher for your OS:

- macOS: `Start-macOS.command`
- Windows: `Start-Windows.bat`
- Linux: `start-linux.sh`
- Raspberry Pi: `start-pi.sh`

Open: http://127.0.0.1:7777

## What You Get

- Local-only chat with streaming responses
- System test page with live hardware checks
- Workspace Explorer for local files (Explorer tab)
- Vision capture and analysis (camera)
- Speech-to-text input and optional voice playback
- Language pack manager and firmware update packs
- Offline guides and diagnostics

## Folder Layout

- `models/` - place `.gguf` files here
- `data/` - local profiles, chats, and settings
- `static/` - production UI assets served by the backend
- `docs/` - pack and firmware documentation
- `ui/` - React UI source
- `server/` - Rust server source

## Development

### UI (local dev server)

```bash
cd ui
npm install
npm run dev
```

The UI dev server proxies `/api` to the backend at `http://127.0.0.1:7777`.

### UI (production build)

```bash
cd ui
npm run build
cp -R dist/* ../static/
```

The backend serves the UI from `static/`.

### Backend

The Rust server handles API requests, model lifecycle, packs, and diagnostics. A Python server is kept as a fallback.

## Workspace Explorer

Use the **Explorer** tab to pick a workspace folder and browse/edit files. The sandbox root is stored in settings and applied to file operations.

## Pack Formats

See `docs/firmware_update_packs.md` and `docs/language_packs.md` for pack definitions and CLI usage.

## USB Release (Plug-and-Play)

To create a self-contained, ready-to-copy USB build, run:

```bash
./tools/build_usb_release.sh
```

This builds the UI, syncs `static/`, and creates `USB_ASSISTANT_RELEASE/` with a trimmed runtime bundle.
Copy `USB_ASSISTANT_RELEASE/` to any USB drive. Users only need to run the OS launcher.

Plug-and-play requires prebuilt backend binaries and runtimes for each target OS/arch:

- `backend/usb-assistant-server-mac-arm64`
- `backend/usb-assistant-server-mac-x64`
- `backend/usb-assistant-server-linux-x64`
- `backend/usb-assistant-server-linux-arm64`
- `backend/usb-assistant-server-win-x64.exe`
- `runtime/mac-arm64`, `runtime/mac-x64`, `runtime/linux-x64`, `runtime/linux-arm64`, `runtime/win-x64`

If any are missing, the release build will stop. You can force a partial build with:

```bash
ALLOW_INCOMPLETE=1 ./tools/build_usb_release.sh
```

## Sync Prebuilt Binaries from GitHub

Use the CI artifacts to populate missing binaries:

```bash
./tools/sync_binaries_from_github.sh
```

This downloads the latest `build-binaries.yml` artifacts and updates `USB_ASSISTANT/backend/`.
You must be logged into GitHub CLI (`gh auth login`).
