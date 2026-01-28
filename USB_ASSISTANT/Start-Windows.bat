@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    IRIS - Windows
echo ========================================
echo.

cd /d "%~dp0"

set "BINARY=backend\usb-assistant-server-win-x64.exe"
set "PYTHON_SERVER=server.py"
set "USE_RUST=false"
set "USE_PYTHON=false"

if exist "%BINARY%" (
    echo [INFO] Found Rust binary: %BINARY%
    set "USE_RUST=true"
) else (
    echo [WARNING] Rust binary not found: %BINARY%
)

if "!USE_RUST!"=="false" (
    if exist "%PYTHON_SERVER%" (
        where python >nul 2>nul
        if !errorlevel! equ 0 (
            echo [INFO] Found Python server and interpreter
            set "USE_PYTHON=true"
        ) else (
            echo [WARNING] Python interpreter not found
        )
    )
)

if "!USE_RUST!"=="false" (
    if "!USE_PYTHON!"=="false" (
        echo.
        echo [ERROR] No server available!
        echo   - Rust binary not found: %BINARY%
        echo   - Python server (server.py) not found or Python not installed
        echo.
        echo Please ensure you have either the Windows binary in the backend folder
        echo or Python installed to run server.py.
        echo.
        pause
        exit /b 1
    )
)

echo [INFO] Starting IRIS server...
echo [INFO] Server will be available at http://127.0.0.1:7777
echo.

if "!USE_RUST!"=="true" (
    echo [INFO] Starting Rust server...
    start "" "%BINARY%"
) else (
    echo [INFO] Starting Python server...
    start "" python "%PYTHON_SERVER%"
)

echo [INFO] Waiting for server to start...
timeout /t 3 /nobreak >nul

echo [INFO] Opening browser...
start http://127.0.0.1:7777

echo.
echo ========================================
echo    Server is running!
echo    Press Ctrl+C to stop
echo ========================================
echo.

pause
