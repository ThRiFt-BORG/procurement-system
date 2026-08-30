@echo off
REM Production launcher for the procurement system.
REM Runs the minimal standalone server built by `npm run build` — not the
REM dev server. See docs/DEPLOYMENT.md for how this gets set to run
REM automatically when the laptop starts.

set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
set NODE_ENV=production
set NEXT_TELEMETRY_DISABLED=1
set PORT=3100
REM 0.0.0.0 so other devices on the restaurant's network (a tablet, a second
REM till) can reach it at this laptop's IP address, not just this machine.
set HOSTNAME=0.0.0.0

cd /d "%~dp0"

if not exist ".next\standalone\server.js" (
  echo No production build found. Run these first:
  echo   npm run build
  pause
  exit /b 1
)

node .next\standalone\server.js
