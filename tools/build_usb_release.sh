#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/USB_ASSISTANT"
RELEASE_DIR="$ROOT_DIR/USB_ASSISTANT_RELEASE"
ALLOW_INCOMPLETE=${ALLOW_INCOMPLETE:-0}

echo "[INFO] Root: $ROOT_DIR"
echo "[INFO] Source: $SOURCE_DIR"
echo "[INFO] Release: $RELEASE_DIR"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "[ERROR] Source directory not found: $SOURCE_DIR"
  exit 1
fi

REQUIRED_BINARIES=(
  "backend/usb-assistant-server-mac-arm64"
  "backend/usb-assistant-server-mac-x64"
  "backend/usb-assistant-server-linux-x64"
  "backend/usb-assistant-server-linux-arm64"
  "backend/usb-assistant-server-win-x64.exe"
)

REQUIRED_RUNTIMES=(
  "runtime/mac-arm64"
  "runtime/mac-x64"
  "runtime/linux-x64"
  "runtime/linux-arm64"
  "runtime/win-x64"
)

missing=()
for item in "${REQUIRED_BINARIES[@]}"; do
  if [ ! -f "$SOURCE_DIR/$item" ]; then
    missing+=("$item")
  fi
done

for item in "${REQUIRED_RUNTIMES[@]}"; do
  if [ ! -d "$SOURCE_DIR/$item" ]; then
    missing+=("$item")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "[ERROR] Missing required runtime files for plug-and-play:"
  for item in "${missing[@]}"; do
    echo "  - $item"
  done
  if [ "$ALLOW_INCOMPLETE" = "1" ]; then
    echo "[WARNING] ALLOW_INCOMPLETE=1 set. Building an incomplete release."
  else
    echo "[INFO] Add the missing binaries/runtimes and re-run."
    echo "[INFO] You can force a partial release with: ALLOW_INCOMPLETE=1 ./tools/build_usb_release.sh"
    exit 1
  fi
fi

echo "[INFO] Building UI..."
cd "$SOURCE_DIR/ui"
npm run build

echo "[INFO] Syncing UI build to static/"
rm -rf "$SOURCE_DIR/static"/*
cp -R "$SOURCE_DIR/ui/dist"/* "$SOURCE_DIR/static/"

echo "[INFO] Preparing release directory..."
mkdir -p "$RELEASE_DIR"

echo "[INFO] Copying runtime bundle..."
rsync -a --delete \
  --exclude "ui/" \
  --exclude "server/" \
  --exclude "tests/" \
  --exclude "scripts/" \
  --exclude "node_modules/" \
  --exclude "__pycache__/" \
  --exclude "*.log" \
  "$SOURCE_DIR/" "$RELEASE_DIR/USB_ASSISTANT/"

echo "[INFO] Copying README"
cp "$SOURCE_DIR/README.md" "$RELEASE_DIR/README.md"

echo "[SUCCESS] Release ready at: $RELEASE_DIR"
