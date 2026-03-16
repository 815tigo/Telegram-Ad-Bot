# Telegram Advertisement Automation Bot

Production-ready system for automated Telegram ad posting using a **real Telegram user account** (Telethon session), not a bot token. Includes a modern React dashboard deployed to Vercel.

## Architecture

```
 ┌──────────────────────────┐       HTTPS        ┌──────────────────────────┐
 │    React Dashboard       │  ←───────────────→  │    FastAPI Backend        │
 │    (Next.js / Vercel)    │    REST JSON API    │    (Python / VPS)         │
 │    frontend/             │                     │    app/                   │
 └──────────────────────────┘                     └────────────┬─────────────┘
                                                               │
                                          ┌────────────────────┤
                                          │                    │
                                   ┌──────┴──────┐    ┌───────┴───────┐
                                   │  SQLite DB   │    │  Telegram API  │
                                   │  data/app.db │    │  (Telethon)    │
                                   └─────────────┘    └───────────────┘
```

## Features

- Telegram user login flow (OTP + optional 2FA), session persisted in DB
- Automatic ad posting to multiple marketplace groups/channels
- Message forwarding support (forward existing messages as ads)
- APScheduler with interval, daily, weekly, one-time, queue, and cron schedules
- Per-group retry with exponential backoff (up to 3 attempts)
- Concurrent post worker limit (`MAX_POST_WORKERS`)
- Reply detection — background Telethon event listener captures replies to ads
- Analytics — sent/failed/replies per campaign and daily activity
- React dashboard with glassmorphic 3D UI, area charts, live status
- Posting logs — full per-post success/failure history
- Rotating file logs with configurable size and backup count
- Crash recovery via systemd `Restart=always`
- SQLite default — easy VPS deployment, no extra services needed

## Tech Stack

### Backend (VPS)

- Python 3.11
- FastAPI + Uvicorn
- Telethon
- APScheduler
- SQLAlchemy + SQLite
- Pydantic-settings

### Frontend (Vercel)

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Recharts
- TanStack Query
- react-hook-form

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── analytics.py       # GET /analytics/*
│   │   ├── auth.py            # POST /auth/start, /auth/verify, /auth/logout
│   │   ├── campaigns.py       # CRUD /campaigns + /campaigns/{id}/trigger
│   │   ├── deps.py            # Shared singletons (telegram_service, scheduler)
│   │   ├── groups.py          # CRUD /groups + /groups/join
│   │   ├── health.py          # GET /health
│   │   ├── logs.py            # GET /logs, /logs/replies
│   │   ├── schedules.py       # CRUD /campaigns/{id}/schedules
│   │   └── security.py        # X-API-Key guard
│   ├── core/
│   │   ├── config.py          # Settings via .env + config.yaml
│   │   └── logging.py         # Console + rotating file logging
│   ├── db/
│   │   ├── database.py        # SQLAlchemy engine + session
│   │   └── models.py          # ORM models
│   ├── scheduler/
│   │   └── job_scheduler.py   # APScheduler campaign jobs
│   ├── services/
│   │   ├── analytics_service.py
│   │   ├── campaign_service.py
│   │   ├── message_sender.py  # Posting logic + retry + semaphore
│   │   ├── reply_listener.py  # Telethon NewMessage handler
│   │   ├── settings_service.py
│   │   └── telegram_service.py
│   ├── main.py                # FastAPI lifespan, CORS, router wiring
│   └── schemas.py             # Pydantic request/response models
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages (overview, campaigns, groups, etc.)
│   │   ├── components/        # Reusable UI (Card, Button, Badge, StatCard, Sidebar)
│   │   ├── lib/               # API client, utilities
│   │   └── types/             # TypeScript interfaces
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── vercel.json
├── config/
│   └── config.yaml            # YAML configuration (optional, .env takes priority)
├── .env                       # Environment variables (primary config)
├── .env.example               # Template for .env
├── requirements.txt           # Python dependencies
├── start.bat                  # Launch backend + frontend on Windows
├── setup.bat                  # First-time setup script
└── stop.bat                   # Stop all services
```

## Quick Start

### First-time setup

```bash
setup.bat
```

This creates a Python venv, installs pip packages, copies `.env.example`, and runs `npm install` in `frontend/`.

### Configure

Edit `.env` with your credentials:

```env
TELEGRAM_API_ID=12345678          # from https://my.telegram.org/apps
TELEGRAM_API_HASH=abcdef123456    # from https://my.telegram.org/apps
ADMIN_API_KEY=your-secret-key     # protects the API (optional for dev)
```

### Run

```bash
start.bat
```

Opens two windows:

| Service | URL |
|---|---|
| **FastAPI backend** | http://localhost:8000 |
| **API docs (Swagger)** | http://localhost:8000/docs |
| **React dashboard** | http://localhost:3000 |

### Stop

```bash
stop.bat
```

## Dashboard Pages

| Page | Purpose |
|---|---|
| `/` | Overview — stat cards, 7-day activity chart, recent posts |
| `/campaigns` | Create, trigger, pause/resume, delete campaigns |
| `/groups` | Join by link or add manually, enable/disable, delete |
| `/schedules` | Add interval/daily/weekly/cron/one-time schedules |
| `/logs` | Full posting history with campaign/status filters |
| `/replies` | Reply inbox — all detected replies to your ads |
| `/auth` | Telegram account login (OTP + 2FA) |

## Telegram User Auth Flow

1. Open the dashboard at http://localhost:3000/auth
2. Enter the phone number linked to your Telegram account
3. Enter the OTP code sent by Telegram
4. If 2FA is enabled, enter your Two-Step Verification password
5. Session is persisted — you only need to log in once

## REST API Endpoints

All endpoints except `/` and `/health` require `X-API-Key` header when `ADMIN_API_KEY` is set.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/auth/status` | Auth status |
| POST | `/auth/start` | Send OTP |
| POST | `/auth/verify` | Verify OTP + optional 2FA |
| POST | `/auth/logout` | Clear session and disconnect |
| GET | `/groups` | List groups |
| POST | `/groups` | Add group manually |
| POST | `/groups/join` | Join and add group by link/@username |
| PATCH | `/groups/{id}` | Update group |
| DELETE | `/groups/{id}` | Remove group |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| PATCH | `/campaigns/{id}` | Update campaign |
| DELETE | `/campaigns/{id}` | Delete campaign |
| POST | `/campaigns/{id}/trigger` | Run campaign now |
| GET | `/campaigns/{id}/schedules` | List schedules |
| POST | `/campaigns/{id}/schedules` | Create schedule |
| PATCH | `/campaigns/{id}/schedules/{sid}` | Update schedule |
| DELETE | `/campaigns/{id}/schedules/{sid}` | Delete schedule |
| GET | `/logs` | Posting logs (paginated, filterable) |
| GET | `/logs/replies` | Replies (paginated, filterable) |
| GET | `/analytics/summary` | Global stats |
| GET | `/analytics/campaign/{id}` | Per-campaign stats |
| GET | `/analytics/daily` | Daily sent/failed activity |
| GET | `/analytics/top-campaigns` | Top campaigns by volume |

Interactive docs: http://localhost:8000/docs

## VPS Deployment

### Backend (systemd)

`/etc/systemd/system/telegram-ad-bot.service`:

```ini
[Unit]
Description=Telegram Advertisement Automation Bot
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/telegram-ad-bot
EnvironmentFile=/opt/telegram-ad-bot/.env
ExecStart=/opt/telegram-ad-bot/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable telegram-ad-bot
sudo systemctl start telegram-ad-bot
```

### Frontend (Vercel)

```bash
cd frontend
npx vercel
```

Set the environment variable `NEXT_PUBLIC_API_URL` to your VPS URL (e.g. `https://api.yourdomain.com`).

Then add the Vercel domain to `CORS_ORIGINS` in your VPS `.env`:

```env
CORS_ORIGINS=["http://localhost:3000","https://your-app.vercel.app"]
```

## Production Checklist

- [ ] Set `ADMIN_API_KEY` to a long random secret
- [ ] Set `ENVIRONMENT=production` and `DEBUG=false`
- [ ] Run backend behind Nginx/Caddy with HTTPS
- [ ] Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing to backend
- [ ] Add Vercel domain to `CORS_ORIGINS`
- [ ] Ensure `data/` directory is on persistent storage (SQLite DB + logs)
- [ ] Vary ad text and intervals to avoid Telegram spam detection
- [ ] Keep `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` private
