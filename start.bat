@echo off
title AdBot - Launcher
color 0B

echo.
echo  ============================================
echo    AdBot Control Center - Starting...
echo  ============================================
echo.

REM Check .venv exists
if not exist ".venv\Scripts\activate.bat" (
    echo  [ERROR] Python virtual environment not found.
    echo  Run setup.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

REM Check frontend node_modules exist
if not exist "frontend\node_modules" (
    echo  [INFO] Installing frontend dependencies...
    cd frontend
    set PATH=C:\Program Files\nodejs;%PATH%
    npm install
    cd ..
)

REM Start backend
echo  [+] Starting FastAPI backend on http://localhost:8000
start "AdBot - Backend" cmd /k "%~dp0run_backend.bat"

REM Wait for backend to boot
timeout /t 2 /nobreak >nul

REM Start frontend
echo  [+] Starting React dashboard on http://localhost:3000
start "AdBot - Dashboard" cmd /k "%~dp0run_frontend.bat"

echo.
echo  ============================================
echo    Both services launched in separate windows
echo.
echo    Backend   -  http://localhost:8000
echo    Docs      -  http://localhost:8000/docs
echo    Dashboard -  http://localhost:3000
echo  ============================================
echo.
echo  Close this window whenever you like.
echo  To stop, close the Backend and Dashboard windows.
echo.
pause
