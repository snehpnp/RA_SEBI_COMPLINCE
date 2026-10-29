@echo off
title Install SEBI DSC Bridge Auto-Start Service
echo ==============================================================
echo   Installing SEBI Hardware DSC Bridge as Auto-Start Service
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [!] Node.js is not installed on this computer.
  echo Attempting to install Node.js automatically via Windows Package Manager...
  where winget >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo Installing Node.js LTS via winget... Please wait a moment.
    winget install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
  ) else (
    echo.
    echo [ERROR] Node.js is required to run the local DSC Bridge.
    echo Please install Node.js from https://nodejs.org (LTS Version).
    start https://nodejs.org/
    echo Once installed, run this file (install-auto-start.bat) again.
    echo.
    pause
    exit /b 1
  )
)

:: 2. Install dependencies if needed
if not exist node_modules (
  echo.
  echo Installing dependencies (first-time only, ~10 seconds)...
  call npm install --no-audit
)

:: 3. Setup Windows Startup shortcut
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\SEBI-DSC-Bridge.lnk
set TARGET_PATH=%~dp0run-silent.vbs

echo.
echo Creating Startup shortcut in: %STARTUP_DIR%
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'SEBI Hardware DSC Bridge Background Service'; $s.Save()"

:: 4. Start the bridge right now in background
echo.
echo Starting DSC Bridge in background right now...
wscript.exe "%TARGET_PATH%"

:: 5. Wait 2 seconds and verify port 1620
timeout /t 2 /nobreak >nul
netstat -ano | findstr :1620 >nul
if %ERRORLEVEL% EQU 0 (
  echo.
  echo ==============================================================
  echo   SUCCESS! The DSC Bridge is now ACTIVE and running:
  echo   - URL: http://127.0.0.1:1620
  echo   - Runs 24/7 in background (no black CMD window)
  echo   - Auto-starts whenever Windows boots up
  echo ==============================================================
  echo.
  echo You can now insert your USB DSC Token and click
  echo 'Retry Bridge Check' on the portal!
) else (
  echo.
  echo Starting bridge process... Please return to the portal and click
  echo 'Retry Bridge Check'.
)

echo.
pause
