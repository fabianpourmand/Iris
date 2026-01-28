#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/USB_ASSISTANT"
DOWNLOAD_DIR="$ROOT_DIR/.tmp_artifacts"
REPO_OVERRIDE=${GITHUB_REPO:-}

if ! command -v gh &> /dev/null; then
  echo "[ERROR] GitHub CLI (gh) is required. Install from https://cli.github.com/"
  exit 1
fi

if [ -n "$REPO_OVERRIDE" ]; then
  REPO="$REPO_OVERRIDE"
else
  if git -C "$ROOT_DIR" remote get-url origin &> /dev/null; then
    REPO_URL=$(git -C "$ROOT_DIR" remote get-url origin)
    REPO=${REPO_URL#https://github.com/}
    REPO=${REPO%.git}
  else
    echo "[ERROR] No git remote origin found. Set GITHUB_REPO=owner/repo"
    exit 1
  fi
fi

echo "[INFO] Repo: $REPO"
mkdir -p "$DOWNLOAD_DIR"

RUN_ID=$(gh run list --repo "$REPO" --workflow "build-binaries.yml" --limit 1 --json databaseId -q '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo "[ERROR] No workflow runs found for build-binaries.yml"
  exit 1
fi

echo "[INFO] Downloading artifacts from run: $RUN_ID"
rm -rf "$DOWNLOAD_DIR"/*
gh run download "$RUN_ID" --repo "$REPO" --dir "$DOWNLOAD_DIR"

declare -A ARTIFACTS
ARTIFACTS[usb-assistant-server-mac-arm64]="backend/usb-assistant-server-mac-arm64"
ARTIFACTS[usb-assistant-server-mac-x64]="backend/usb-assistant-server-mac-x64"
ARTIFACTS[usb-assistant-server-linux-x64]="backend/usb-assistant-server-linux-x64"
ARTIFACTS[usb-assistant-server-linux-arm64]="backend/usb-assistant-server-linux-arm64"
ARTIFACTS[usb-assistant-server-win-x64]="backend/usb-assistant-server-win-x64.exe"

missing=()
for artifact in "${!ARTIFACTS[@]}"; do
  src="$DOWNLOAD_DIR/$artifact/$artifact"
  dest="$SOURCE_DIR/${ARTIFACTS[$artifact]}"
  if [ -f "$src" ]; then
    echo "[INFO] Updating $dest"
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  else
    missing+=("$artifact")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "[WARNING] Missing artifacts:"
  for item in "${missing[@]}"; do
    echo "  - $item"
  done
  exit 1
fi

echo "[SUCCESS] Backend binaries synced to USB_ASSISTANT/backend"
