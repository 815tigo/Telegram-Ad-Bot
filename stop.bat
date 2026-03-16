@echo off
title AdBot — Stop
color 0C

echo.
echo  [+] Stopping AdBot services...
echo.

REM Kill uvicorn (backend)
taskkill /F /FI "WINDOWTITLE eq AdBot — Backend*" >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

REM Kill node (frontend dev server)
taskkill /F /FI "WINDOWTITLE eq AdBot — Dashboard*" >nul 2>&1

echo  [OK] Services stopped.
echo.
timeout /t 2 /nobreak >nul
