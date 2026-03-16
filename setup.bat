@echo off
title AdBot — Setup
color 0E

echo.
echo  ============================================
echo    AdBot — First-Time Setup
echo  ============================================
echo.

REM ── Python venv ──────────────────────────────────────────────────────────
if not exist ".venv" (
    echo  [1/4] Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo  [ERROR] Python not found or failed. Install Python 3.11+ first.
        pause & exit /b 1
    )
) else (
    echo  [1/4] Virtual environment already exists, skipping.
)

REM ── Python dependencies ───────────────────────────────────────────────────
echo  [2/4] Installing Python dependencies...
call .venv\Scripts\activate
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo  [ERROR] pip install failed.
    pause & exit /b 1
)

REM ── .env file ─────────────────────────────────────────────────────────────
if not exist ".env" (
    echo  [3/4] Copying .env.example to .env ...
    copy .env.example .env >nul
    echo  [!] Open .env and fill in your TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE
) else (
    echo  [3/4] .env already exists, skipping.
)

REM ── Frontend dependencies ─────────────────────────────────────────────────
echo  [4/4] Installing frontend npm packages...
cd frontend
npm install --quiet
cd ..

echo.
echo  ============================================
echo    Setup complete!
echo.
echo    Next steps:
echo      1. Edit .env with your Telegram credentials
echo      2. Run start.bat to launch everything
echo  ============================================
echo.
pause
