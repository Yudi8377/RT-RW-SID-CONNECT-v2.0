@echo off
setlocal
set "CONFIG=%~dp0license.ini"
set "PLAN=trial"

if exist "%CONFIG%" (
  for /f "tokens=1,* delims==" %%A in ('findstr /b "PLAN=" "%CONFIG%" 2^>nul') do set "PLAN=%%B"
)

if /I "%PLAN%"=="pro" (
  start "" "https://rtrw-sid-connect-v20.hatchable.site/?plan=pro"
  exit /b 0
)

if /I "%PLAN%"=="enterprise" (
  start "" "https://rtrw-sid-connect-v20.hatchable.site/?plan=enterprise"
  exit /b 0
)

start "" "https://rtrw-sid-connect-v20.hatchable.site/?plan=trial"
exit /b 0
