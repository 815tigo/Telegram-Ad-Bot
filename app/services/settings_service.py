from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Setting


class SettingsService:
    TELEGRAM_SESSION_KEY = "telegram_string_session"

    @staticmethod
    def get_value(db: Session, key: str) -> str | None:
        row = db.scalar(select(Setting).where(Setting.key == key))
        return row.value if row else None

    @staticmethod
    def upsert_value(db: Session, key: str, value: str) -> None:
        row = db.scalar(select(Setting).where(Setting.key == key))
        if row:
            row.value = value
        else:
            db.add(Setting(key=key, value=value))
        db.commit()
