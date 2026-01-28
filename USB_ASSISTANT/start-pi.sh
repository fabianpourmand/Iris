#!/bin/bash

echo "========================================"
echo "   IRIS - Raspberry Pi"
echo "========================================"
echo

# Change to script directory
cd "$(dirname "$0")"

# Verify we're on ARM
ARCH=$(uname -m)
if [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "arm64" ] && [ "$ARCH" != "armv7l" ]; then
    echo "[WARNING] This script is optimized for Raspberry Pi (ARM)."
    echo "[WARNING] Detected architecture: $ARCH"
    echo "[WARNING] Consider using start-linux.sh instead."
    echo
fi

BINARY="backend/usb-assistant-server-linux-arm64"
LLAMA_DIR="runtime/linux-arm64"

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

# Make binary executable
if [ "$USE_RUST" = true ]; then
    chmod +x "$BINARY"
fi

# Show system info for Pi
echo
echo "[INFO] System Information:"
echo "  - Architecture: $ARCH"
if [ -f /proc/device-tree/model ]; then
    echo "  - Model: $(cat /proc/device-tree/model)"
fi
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_AVAIL=$(free -m | awk '/^Mem:/{print $7}')
echo "  - Memory: ${MEM_AVAIL}MB available / ${MEM_TOTAL}MB total"
echo

# Warn about low memory
if [ "$MEM_AVAIL" -lt 2048 ]; then
    echo "[WARNING] Low memory detected (${MEM_AVAIL}MB available)."
    echo "[WARNING] Consider using smaller models (1-3GB)."
    echo "[WARNING] Close other applications to free memory."
    echo
fi

echo "[INFO] Starting IRIS server..."
echo "[INFO] Server will be available at http://127.0.0.1:7777"
echo "[INFO] Note: Initial load may be slow on Raspberry Pi."
echo

# Set lower resource defaults for Pi
export USB_ASSISTANT_THREADS=2
export USB_ASSISTANT_CTX_SIZE=2048

# Start appropriate server in background
if [ "$USE_RUST" = true ]; then
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

# Wait longer for Pi to start
echo "[INFO] Waiting for server to start (this may take a moment)..."
sleep 5

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "[INFO] Server started successfully (PID: $SERVER_PID)"
    echo "[INFO] Opening browser..."
    
    # Try Chromium first (common on Pi), then others
    if command -v chromium-browser &> /dev/null; then
        chromium-browser "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v chromium &> /dev/null; then
        chromium "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://127.0.0.1:7777" 2>/dev/null &
    elif command -v firefox-esr &> /dev/null; then
        firefox-esr "http://127.0.0.1:7777" 2>/dev/null &
    else
        echo "[INFO] Could not auto-open browser. Please navigate to:"
        echo "       http://127.0.0.1:7777"
    fi
else
    echo "[ERROR] Server failed to start."
    echo "This may be due to insufficient memory or missing libraries."
    echo
    echo "Troubleshooting:"
    echo "  1. Check available memory: free -h"
    echo "  2. Close other applications"
    echo "  3. Try running the binary directly: ./$BINARY"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

echo
echo "========================================"
echo "   Server is running!"
echo "   Press Ctrl+C to stop"
echo "========================================"
echo
echo "[TIP] For best performance on Raspberry Pi:"
echo "  - Use 2-3B parameter models"
echo "  - Keep context size at 2048 or lower"
echo "  - Use 2-4 threads"
echo

# Trap Ctrl+C to cleanup
trap "echo; echo '[INFO] Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

# Wait for server process
wait $SERVER_PID
