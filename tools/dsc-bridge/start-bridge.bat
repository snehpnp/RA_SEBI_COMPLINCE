@echo off
title SEBI Research Analyst DSC Local Bridge
echo ==============================================================
echo   SEBI Research Analyst Hardware DSC Token Local Bridge
echo ==============================================================
echo.
cd /d "%~dp0"

:: 1. If Node.js and express are installed, use Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  if exist node_modules\express (
    echo Starting bridge via Node.js on http://127.0.0.1:1620 ...
    node server.js
    pause
    exit /b 0
  )
)

:: 2. Otherwise run pure native Windows PowerShell (Zero install, works out of the box)
echo Starting bridge via Native Windows PowerShell on http://127.0.0.1:1620 ...
echo (No Node.js or software installation required)
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bridge.ps1" -Port 1620
pause
