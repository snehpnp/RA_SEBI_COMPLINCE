@echo off
title SEBI Research Analyst DSC Local Bridge
echo ==============================================================
echo   SEBI Research Analyst Hardware DSC Token Local Bridge
echo ==============================================================
echo.
cd /d "%~dp0"

set PORT=1620
if not "%1"=="" set PORT=%1

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [!] Node.js is not installed or not in PATH.
  echo Checking Windows winget to install Node.js automatically...
  where winget >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo Installing Node.js LTS via winget...
    winget install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
  ) else (
    echo.
    echo [ERROR] Node.js is required to run the local DSC Bridge.
    echo Please install Node.js from https://nodejs.org
    start https://nodejs.org/
    pause
    exit /b 1
  )
)

echo Starting Node.js Hardware DSC Bridge on http://127.0.0.1:%PORT% ...
echo Make sure your physical USB DSC Token is inserted.
echo.
node server.js
pause
