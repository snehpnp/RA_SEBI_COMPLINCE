@echo off
title Uninstall SEBI DSC Bridge Auto-Start Service
echo ==============================================================
echo   Uninstalling SEBI Hardware DSC Bridge Auto-Start Service
echo ==============================================================
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\SEBI-DSC-Bridge.lnk

if exist "%SHORTCUT_PATH%" (
  del /f /q "%SHORTCUT_PATH%"
  echo Removed auto-start shortcut from Windows Startup folder.
) else (
  echo Auto-start shortcut not found in Startup folder.
)

echo Stopping any running bridge on port 1620...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 1620 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo.
echo DSC Bridge auto-start service uninstalled and stopped.
echo.
pause

