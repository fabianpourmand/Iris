#!/bin/bash

# IRIS - Cross-Platform Build Script
# This script builds the Rust backend for all supported platforms

set -e

echo "========================================"
echo "   IRIS - Build All"
echo "========================================"
echo

# Navigate to server directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="${SCRIPT_DIR}/server"

if [ ! -d "$SERVER_DIR" ]; then
    echo "[ERROR] Server source directory not found: $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"

echo "[INFO] Building from: $SERVER_DIR"
echo

# Function to build for a target
build_target() {
    local TARGET=$1
    local OUTPUT_NAME=$2
    
    echo "----------------------------------------"
    echo "[BUILD] Target: $TARGET"
    echo "[BUILD] Output: $OUTPUT_NAME"
    echo "----------------------------------------"
    
    if rustup target list --installed | grep -q "$TARGET"; then
        echo "[INFO] Target already installed: $TARGET"
    else
        echo "[INFO] Installing target: $TARGET"
        rustup target add "$TARGET"
    fi
    
    echo "[INFO] Building..."
    cargo build --release --target "$TARGET"
    
    # Copy to USB_ASSISTANT/backend/
    local SRC="target/$TARGET/release/usb-assistant-server"
    if [ "$TARGET" = "x86_64-pc-windows-gnu" ] || [ "$TARGET" = "x86_64-pc-windows-msvc" ]; then
        SRC="${SRC}.exe"
    fi
    
    if [ -f "$SRC" ]; then
        cp "$SRC" "${SCRIPT_DIR}/backend/${OUTPUT_NAME}"
        echo "[SUCCESS] Built: ${OUTPUT_NAME}"
    else
        echo "[ERROR] Build output not found: $SRC"
        return 1
    fi
    echo
}

# Check if cross-compilation tools are available
check_cross_tools() {
    echo "[INFO] Checking cross-compilation tools..."
    echo
    
    # Check for cargo
    if ! command -v cargo &> /dev/null; then
        echo "[ERROR] Cargo not found. Install Rust: https://rustup.rs"
        exit 1
    fi
    
    echo "[INFO] Cargo version: $(cargo --version)"
    echo "[INFO] Rustc version: $(rustc --version)"
    echo
}

check_cross_tools

echo "========================================"
echo "   Building Native Target"
echo "========================================"
echo

# Always build native first
HOST_TARGET=$(rustc -vV | grep host | awk '{print $2}')
echo "[INFO] Host target: $HOST_TARGET"

cargo build --release
echo "[SUCCESS] Native build complete"
echo

# Determine output name based on host
case "$HOST_TARGET" in
    x86_64-unknown-linux-gnu)
        cp target/release/usb-assistant-server "${SCRIPT_DIR}/backend/usb-assistant-server-linux-x64"
        ;;
    aarch64-unknown-linux-gnu)
        cp target/release/usb-assistant-server "${SCRIPT_DIR}/backend/usb-assistant-server-linux-arm64"
        ;;
    x86_64-apple-darwin)
        cp target/release/usb-assistant-server "${SCRIPT_DIR}/backend/usb-assistant-server-mac-x64"
        ;;
    aarch64-apple-darwin)
        cp target/release/usb-assistant-server "${SCRIPT_DIR}/backend/usb-assistant-server-mac-arm64"
        ;;
esac

echo "========================================"
echo "   Cross-Compilation Targets"
echo "========================================"
echo

echo "[INFO] The following targets require cross-compilation tools:"
echo
echo "  Linux x64:    x86_64-unknown-linux-gnu"
echo "  Linux ARM64:  aarch64-unknown-linux-gnu"
echo "  macOS x64:    x86_64-apple-darwin"
echo "  macOS ARM64:  aarch64-apple-darwin"
echo "  Windows x64:  x86_64-pc-windows-gnu"
echo

echo "========================================"
echo "   Cross-Compilation Setup Instructions"
echo "========================================"
echo
echo "### Linux (for cross-compiling):"
echo
echo "  # Install cross-compilation toolchains"
echo "  sudo apt install -y gcc-aarch64-linux-gnu"
echo "  sudo apt install -y gcc-mingw-w64-x86-64"
echo
echo "  # Add Rust targets"
echo "  rustup target add aarch64-unknown-linux-gnu"
echo "  rustup target add x86_64-pc-windows-gnu"
echo
echo "  # Configure ~/.cargo/config.toml:"
echo '  [target.aarch64-unknown-linux-gnu]'
echo '  linker = "aarch64-linux-gnu-gcc"'
echo
echo '  [target.x86_64-pc-windows-gnu]'
echo '  linker = "x86_64-w64-mingw32-gcc"'
echo
echo "### macOS targets:"
echo "  macOS binaries must be built on macOS due to SDK requirements."
echo "  Consider using GitHub Actions or a macOS build machine."
echo
echo "### Using 'cross' tool (recommended):"
echo "  cargo install cross"
echo "  cross build --release --target aarch64-unknown-linux-gnu"
echo "  cross build --release --target x86_64-pc-windows-gnu"
echo

echo "========================================"
echo "   Build Complete"
echo "========================================"
echo
echo "[INFO] Native build placed in: ${SCRIPT_DIR}/backend/"
echo
echo "[INFO] To build for other platforms, follow the instructions above"
echo "       or use CI/CD (GitHub Actions) for automated cross-platform builds."
echo
