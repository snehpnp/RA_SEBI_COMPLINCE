@echo off
title Install SEBI DSC Bridge Auto-Start Service
echo ==============================================================
echo   Installing SEBI Hardware DSC Bridge as Auto-Start Service
echo ==============================================================
echo.

cd /d "%~dp0"

:: Create Startup shortcut in Windows Startup folder
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\SEBI-DSC-Bridge.lnk
set TARGET_PATH=%~dp0run-silent.vbs

echo Creating Startup shortcut in: %STARTUP_DIR%
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'SEBI Hardware DSC Bridge Background Service'; $s.Save()"

echo.
echo Starting DSC Bridge in background right now...
wscript.exe "%TARGET_PATH%"

timeout /t 2 /nobreak >nul
netstat -ano | findstr :1620 >nul
if %ERRORLEVEL% EQU 0 (
  echo.
  echo ==============================================================
  echo   SUCCESS! The DSC Bridge is now ACTIVE and running:
  echo   - URL: http://127.0.0.1:1620
  echo   - Runs 24/7 in background (no black CMD window)
  echo   - Auto-starts whenever Windows boots up
  echo   - Zero external dependencies (Pure Native Windows)
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
