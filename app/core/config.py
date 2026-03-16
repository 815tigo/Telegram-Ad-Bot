from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_YAML_PATH = Path(__file__).parent.parent.parent / "config" / "config.yaml"


def _load_yaml_defaults() -> dict[str, Any]:
    if not _YAML_PATH.exists():
        return {}
    try:
        import yaml
    except ImportError:
        return {}

    with _YAML_PATH.open(encoding="utf-8") as fh:
        raw: dict = yaml.safe_load(fh) or {}

    flat: dict[str, Any] = {}

    def _get(d: dict, *keys: str, default: Any = None) -> Any:
        cur = d
        for k in keys:
            if not isinstance(cur, dict):
                return default
            cur = cur.get(k, default)
        return cur

    api_id = _get(raw, "telegram", "api_id")
    if api_id:
        flat["telegram_api_id"] = int(api_id)
    api_hash = _get(raw, "telegram", "api_hash")
    if api_hash:
        flat["telegram_api_hash"] = api_hash
    for sub_key, field_name in [
        ("device_model", "telegram_device_model"),
        ("system_version", "telegram_system_version"),
        ("app_version", "telegram_app_version"),
    ]:
        val = _get(raw, "telegram", sub_key)
        if val:
            flat[field_name] = val

    rl = _get(raw, "posting", "rate_limit_seconds")
    if rl is not None:
        flat["default_inter_group_delay_seconds"] = int(rl)
    mpw = _get(raw, "posting", "max_post_workers")
    if mpw is not None:
        flat["max_post_workers"] = int(mpw)

    tz = _get(raw, "scheduler", "timezone")
    if tz:
        flat["scheduler_timezone"] = tz

    db_url = _get(raw, "database", "url")
    if db_url:
        flat["database_url"] = db_url

    host = _get(raw, "server", "host")
    if host:
        flat["host"] = host
    port = _get(raw, "server", "port")
    if port is not None:
        flat["port"] = int(port)

    log_level = _get(raw, "logging", "level")
    if log_level:
        flat["log_level"] = log_level
    log_file = _get(raw, "logging", "file")
    if log_file:
        flat["log_file"] = log_file
    max_bytes = _get(raw, "logging", "max_bytes")
    if max_bytes is not None:
        flat["log_max_bytes"] = int(max_bytes)
    backup_count = _get(raw, "logging", "backup_count")
    if backup_count is not None:
        flat["log_backup_count"] = int(backup_count)

    rle = _get(raw, "features", "reply_listener_enabled")
    if rle is not None:
        flat["reply_listener_enabled"] = bool(rle)

    fwd = _get(raw, "reply", "forward_chat")
    if fwd:
        flat["reply_forward_chat"] = fwd

    return flat


class Settings(BaseSettings):
    app_name: str = "telegram-ad-automation"
    environment: str = "dev"
    debug: bool = False

    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    database_url: str = "sqlite:///./data/app.db"

    telegram_api_id: int = Field(default=0, ge=0)
    telegram_api_hash: str = ""
    telegram_device_model: str = "VPS Bot Manager"
    telegram_system_version: str = "Linux"
    telegram_app_version: str = "1.0.0"

    scheduler_timezone: str = "Asia/Kolkata"
    max_post_workers: int = 3
    default_inter_group_delay_seconds: int = 3

    redis_url: str | None = None
    admin_api_key: str | None = None

    reply_forward_chat: str | None = None

    log_file: str = "data/logs/app.log"
    log_max_bytes: int = 10_000_000
    log_backup_count: int = 5

    reply_listener_enabled: bool = True
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    yaml_defaults = _load_yaml_defaults()
    if yaml_defaults:
        return Settings(**yaml_defaults)
    return Settings()
