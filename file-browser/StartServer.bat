@echo off
title OBS Host File Browser
cd /d "%~dp0"

if "%PORT%"=="" set PORT=3000

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

echo Starting File Browser server on port %PORT%...
echo Access standalone file manager at: http://localhost:%PORT%/
echo.
node server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] File Browser server stopped with an error code: %ERRORLEVEL%
    pause
)
