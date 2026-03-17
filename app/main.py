import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.campaigns import router as campaigns_router
from app.api.deps import campaign_scheduler, telegram_service
from app.api.groups import router as groups_router
from app.api.health import router as health_router
from app.api.logs import router as logs_router
from app.api.schedules import router as schedules_router
from app.api.security import require_api_key
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.database import Base, SessionLocal, engine
from app.services.reply_listener import ReplyListener
from app.services.settings_service import SettingsService

settings = get_settings()
setup_logging(
    settings.log_level,
    log_file=settings.log_file,
    max_bytes=settings.log_max_bytes,
    backup_count=settings.log_backup_count,
)
logger = logging.getLogger(__name__)

_reply_listener = ReplyListener()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        saved_session = SettingsService.get_value(db, SettingsService.TELEGRAM_SESSION_KEY)
    except SQLAlchemyError:
        logger.exception("Failed to read persisted Telegram session")
        saved_session = None
    finally:
        db.close()

    await telegram_service.init_client(saved_session)
    campaign_scheduler.start()

    if settings.reply_listener_enabled:
        _reply_listener.start(telegram_service, db_factory=SessionLocal)

    from app.core.config import _YAML_PATH
    yaml_status = "loaded" if _YAML_PATH.exists() else "not found (using .env / defaults)"
    logger.info(
        "Bot started  env=%s  db=%s  tz=%s  log=%s  yaml=%s  reply_listener=%s",
        settings.environment,
        settings.database_url,
        settings.scheduler_timezone,
        settings.log_file,
        yaml_status,
        settings.reply_listener_enabled,
    )
    try:
        yield
    finally:
        logger.info("Bot shutting down — graceful shutdown initiated")
        if settings.reply_listener_enabled:
            _reply_listener.stop(telegram_service)
        campaign_scheduler.shutdown()
        await telegram_service.disconnect()
        logger.info("Bot stopped — all services shut down cleanly")


app = FastAPI(
    title="Telegram Advertisement Automation Bot",
    version="2.0.0",
    lifespan=lifespan,
)

_cors_origins: list[str] = settings.cors_origins or []
# Always ensure localhost:3000 is allowed for local development
_LOCAL_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://telegram-ad-bot.vercel.app",
]
for _o in _LOCAL_ORIGINS:
    if _o not in _cors_origins:
        _cors_origins.append(_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, dependencies=[Depends(require_api_key)])
app.include_router(groups_router, dependencies=[Depends(require_api_key)])
app.include_router(campaigns_router, dependencies=[Depends(require_api_key)])
app.include_router(logs_router, dependencies=[Depends(require_api_key)])
app.include_router(analytics_router, dependencies=[Depends(require_api_key)])
app.include_router(schedules_router, dependencies=[Depends(require_api_key)])

@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "status": "running", "docs": "/docs"}
