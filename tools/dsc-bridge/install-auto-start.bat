@echo off
title Install SEBI DSC Bridge Auto-Start Service
echo ==============================================================
echo   Installing SEBI Hardware DSC Bridge as Auto-Start Service
echo ==============================================================
echo.

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies (first-time only)...
  call npm install --no-audit
)

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\SEBI-DSC-Bridge.lnk
set TARGET_PATH=%~dp0run-silent.vbs

echo Creating Startup shortcut in: %STARTUP_DIR%
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'SEBI Hardware DSC Bridge Background Service'; $s.Save()"

echo.
echo Starting DSC Bridge in background right now...
wscript.exe "%TARGET_PATH%"

echo.
echo ==============================================================
echo   SUCCESS! The DSC Bridge will now run automatically:
echo   - Runs 24/7 in the background (no black command window)
echo   - Auto-starts whenever Windows boots up / logs in
echo   - Listening on http://127.0.0.1:1620
echo ==============================================================
echo.
pause

