@echo off
title AdBot - Backend
color 0A
echo.
echo  AdBot FastAPI Backend
echo  http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo.
cd /d "%~dp0"
call .venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
