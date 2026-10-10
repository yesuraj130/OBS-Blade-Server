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
    echo [INFO] First time run detected. Installing dependencies...
    call npm install
    echo.
)

echo Starting File Browser server on port 3000...
echo Access standalone file manager at: http://localhost:3000/
echo.
node server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] File Browser server stopped with an error code: %ERRORLEVEL%
    pause
)
