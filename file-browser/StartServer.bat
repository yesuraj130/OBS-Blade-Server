@echo off
title OBS Host File Browser
cd /d "%~dp0"

echo ===================================================
echo   OBS Host File Browser Microservice
echo ===================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/ to run this service.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] First time run detected. Installing production dependencies...
    call npm install --omit=dev --no-audit --no-fund
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo.
)

set DISPLAY_PORT=%PORT%
if "%DISPLAY_PORT%"=="" (
    for /f "usebackq delims=" %%i in (`node -e "import('./config.js').then(m=>console.log(Number(m.default?.port)||3000)).catch(()=>console.log(3000))"`) do set DISPLAY_PORT=%%i
)
if "%DISPLAY_PORT%"=="" set DISPLAY_PORT=3000

echo Starting File Browser server on port %DISPLAY_PORT%...
echo Access standalone file manager at: http://localhost:%DISPLAY_PORT%/
echo.
node server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] File Browser server stopped with an error code: %ERRORLEVEL%
    pause
)
