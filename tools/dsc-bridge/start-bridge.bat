@echo off
title SEBI Research Analyst DSC Local Bridge
echo ==============================================================
echo   SEBI Research Analyst Hardware DSC Token Local Bridge
echo ==============================================================
echo.
echo Starting bridge service on http://127.0.0.1:1620 ...
echo Make sure your USB DSC Token (ePass2003, mToken, ProxKey) is plugged in.
echo.

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies (first-time only)...
  npm install --no-audit
)

node server.js
pause
