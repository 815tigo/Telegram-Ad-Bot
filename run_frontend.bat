@echo off
title AdBot - Dashboard
color 0B
echo.
echo  AdBot React Dashboard
echo  http://localhost:3000
echo.
cd /d "%~dp0frontend"
set PATH=C:\Program Files\nodejs;%PATH%
npm run dev
pause
