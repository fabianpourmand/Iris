#!/bin/bash

echo "========================================"
echo "   IRIS - Linux"
echo "========================================"
echo

# Change to script directory
cd "$(dirname "$0")"

# Detect architecture
ARCH=$(uname -m)
echo "[INFO] Detected architecture: $ARCH"

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    BINARY="backend/usb-assistant-server-linux-arm64"
    LLAMA_DIR="runtime/linux-arm64"
else
    BINARY="backend/usb-assistant-server-linux-x64"
    LLAMA_DIR="runtime/linux-x64"
fi

# 1. Check for Rust binary (Preferred)
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
    PYTHON_SERVER="server.py"
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
    echo "[ERROR] No server available to start!"
    echo "  - Rust binary not found at: $BINARY"
    echo "  - Python server (server.py) not found or Python 3 not installed"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "[INFO] Starting IRIS server..."
echo "[INFO] Server will be available at http://127.0.0.1:7777"
echo

# Start appropriate server in background
if [ "$USE_RUST" = true ]; then
    # Make binary executable
    chmod +x "$BINARY"
    echo "[INFO] Starting Rust server..."
    "$BINARY" &
    SERVER_PID=$!
    echo "[INFO] Started Rust server (PID: $SERVER_PID)"
elif [ "$USE_PYTHON" = true ]; then
    echo "[INFO] Starting Python server..."
    python3 "$PYTHON_SERVER" &
    SERVER_PID=$!
    echo "[INFO] Started Python server (PID: $SERVER_PID)"
fi

# Wait for server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "[INFO] Server started successfully (PID: $SERVER_PID)"
    echo "[INFO] Opening browser..."
    
    # Try different browser openers
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v gnome-open &> /dev/null; then
        gnome-open "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser "http://127.0.0.1:7777" 2>/dev/null &
    else
        echo "[INFO] Could not auto-open browser. Please navigate to:"
        echo "       http://127.0.0.1:7777"
    fi
else
    echo "[ERROR] Server failed to start."
    echo "Check the console output above for errors."
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "========================================"
echo "   Server is running!"
echo "   Press Ctrl+C to stop"
echo "========================================"
echo

# Trap Ctrl+C to cleanup
trap "echo; echo '[INFO] Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

# Wait for server process
wait $SERVER_PID
