@echo off
title AdBot — Launcher
color 0B

echo.
echo  ============================================
echo    AdBot Control Center — Starting...
echo  ============================================
echo.

REM ── Check .venv exists ───────────────────────────────────────────────────
if not exist ".venv\Scripts\activate.bat" (
    echo  [ERROR] Python virtual environment not found.
    echo  Run:  python -m venv .venv
    echo        .venv\Scripts\activate
    echo        pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

REM ── Check frontend node_modules exist ────────────────────────────────────
if not exist "frontend\node_modules" (
    echo  [INFO] node_modules not found. Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM ── Start FastAPI backend in a new window ─────────────────────────────────
echo  [+] Starting FastAPI backend on http://localhost:8000
start "AdBot — Backend" cmd /k "title AdBot — Backend && color 0A && echo. && echo  AdBot FastAPI Backend && echo  http://localhost:8000 && echo  Docs: http://localhost:8000/docs && echo. && call .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM ── Wait 2 seconds for backend to boot ────────────────────────────────────
timeout /t 2 /nobreak >nul

REM ── Start Next.js frontend in a new window ────────────────────────────────
echo  [+] Starting React dashboard on http://localhost:3000
start "AdBot — Dashboard" cmd /k "title AdBot — Dashboard && color 0B && echo. && echo  AdBot React Dashboard && echo  http://localhost:3000 && echo. && set PATH=C:\Program Files\nodejs;%PATH% && cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ============================================
echo    Both services launched in separate windows
echo.
echo    Backend   →  http://localhost:8000
echo    Docs      →  http://localhost:8000/docs
echo    Dashboard →  http://localhost:3000
echo  ============================================
echo.
echo  Close this window whenever you like.
echo  To stop, close the Backend and Dashboard windows.
echo.
pause
