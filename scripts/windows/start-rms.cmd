@echo off
REM =====================================================================
REM RMS: start the production server (PROD-1).
REM Used by the scheduled task "RMS Server" (autostart-rms.ps1), and can
REM also be double-clicked. Closing this window stops RMS.
REM   - needs a finished "npm run build"
REM   - the database (Docker Desktop) must be running
REM   - output is added to ..\rms-logs\rms-server.log (outside the project)
REM =====================================================================
title RMS Server
cd /d "%~dp0..\.."

if not exist ".next\BUILD_ID" (
  echo RMS has not been built yet. Run:  npm run build
  pause
  exit /b 1
)

if not exist "..\rms-logs" mkdir "..\rms-logs"

echo RMS is starting on port 3000 ... (log: ..\rms-logs\rms-server.log)
echo Keep this window open. Closing it stops RMS.
call npm start -- -p 3000 >> "..\rms-logs\rms-server.log" 2>&1
