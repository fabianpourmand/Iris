#!/bin/bash

echo "========================================"
echo "   IRIS - Integrated Resource &"
echo "   Intelligence System - macOS"
echo "========================================"
echo

# Change to script directory (portable path support)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[INFO] Working directory: $SCRIPT_DIR"

# Detect architecture
ARCH=$(uname -m)
echo "[INFO] Detected architecture: $ARCH"

# Server configuration
PORT=7777
URL="http://127.0.0.1:$PORT"

# 1. Check for Rust binary (Preferred)
if [ "$ARCH" = "arm64" ]; then
    BINARY="$SCRIPT_DIR/backend/usb-assistant-server-mac-arm64"
else
    BINARY="$SCRIPT_DIR/backend/usb-assistant-server-mac-x64"
fi

USE_RUST=false
if [ -f "$BINARY" ]; then
    echo "[INFO] Found Rust binary: $BINARY"
    USE_RUST=true
else
    echo "[WARNING] Rust binary not found at: $BINARY"
fi

# 2. Check for Python server (Fallback)
USE_PYTHON=false
if [ "$USE_RUST" = false ]; then
    PYTHON_SERVER="$SCRIPT_DIR/server.py"
    if [ -f "$PYTHON_SERVER" ]; then
        if command -v python3 &> /dev/null; then
            echo "[INFO] Found Python server: server.py"
            USE_PYTHON=true
        else
            echo "[WARNING] Python 3 not found"
        fi
    fi
fi

# 3. Final Availability Check
if [ "$USE_RUST" = false ] && [ "$USE_PYTHON" = false ]; then
    echo
    echo "[ERROR] No server available!"
    echo "  - Python server (server.py) not found or Python 3 not installed"
    echo "  - Rust binary not found at: $BINARY"
    echo
    echo "Please ensure you have either:"
    echo "  1. Python 3 installed (recommended)"
    echo "  2. The macOS Rust binary in the backend folder"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

# 4. Preparation
echo "[INFO] Cleaning up existing processes..."
lsof -ti:7777 | xargs kill -9 2>/dev/null || true
lsof -ti:7778 | xargs kill -9 2>/dev/null || true

# Robust dynamic library path for llama-server
PLATFORM_RUNTIME="$SCRIPT_DIR/runtime/mac-arm64"
if [ "$ARCH" != "arm64" ]; then
    PLATFORM_RUNTIME="$SCRIPT_DIR/runtime/mac-x64"
fi
export DYLD_LIBRARY_PATH="$PLATFORM_RUNTIME:$DYLD_LIBRARY_PATH"

# Check if static folder exists (Heritage UI)
if [ ! -d "$SCRIPT_DIR/static" ]; then
    echo "[WARNING] Static folder not found at: $SCRIPT_DIR/static"
    echo "[WARNING] The Heritage UI may not be available."
fi

echo
echo "[INFO] Starting IRIS server..."
echo "[INFO] Server will be available at $URL"
echo

# Start appropriate server in background
if [ "$USE_RUST" = true ]; then
    # Make everything executable
    chmod +x "$BINARY"
    find "$PLATFORM_RUNTIME" -type f -exec chmod +x {} + 2>/dev/null || true
    
    # Handle Gatekeeper (unsigned binary warning) - Recursive for libraries
    echo "[INFO] Clearing macOS Gatekeeper flags recursively..."
    xattr -rd com.apple.quarantine "$BINARY" 2>/dev/null || true
    xattr -rd com.apple.quarantine "$SCRIPT_DIR/runtime" 2>/dev/null || true
    xattr -rd com.apple.quarantine "$SCRIPT_DIR/backend" 2>/dev/null || true

    echo "[INFO] Starting Rust server..."
    "$BINARY" > "$SCRIPT_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    echo "[INFO] Started Rust server (PID: $SERVER_PID)"
    echo "[INFO] Logs available at: $SCRIPT_DIR/server.log"
elif [ "$USE_PYTHON" = true ]; then
    echo "[INFO] Starting Python server..."
    python3 "$PYTHON_SERVER" &
    SERVER_PID=$!
    echo "[INFO] Started Python server (PID: $SERVER_PID)"
fi

# Wait for server to start
echo "[INFO] Waiting for server to initialize..."
sleep 4

# Check if server is running
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "[INFO] Server started successfully!"
    echo "[INFO] Opening browser..."
    open "$URL"
else
    echo
    echo "[ERROR] Server failed to start."
    echo "Check the log file for detailed errors: $SCRIPT_DIR/server.log"
    if [ -f "$SCRIPT_DIR/server.log" ]; then
        echo "--- LAST LOG ENTRIES ---"
        tail -n 10 "$SCRIPT_DIR/server.log"
        echo "------------------------"
    fi
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "========================================"
echo "   IRIS Server is running!"
echo "   URL: $URL"
echo "   Press Ctrl+C to stop"
echo "========================================"
echo

# Handle Ctrl+C gracefully
trap "echo; echo '[INFO] Shutting down IRIS server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

# Wait for server process
wait $SERVER_PID
