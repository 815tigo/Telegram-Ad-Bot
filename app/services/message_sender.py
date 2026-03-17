import asyncio
import logging
import mimetypes
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session
from telethon.errors import (
    ChannelPrivateError,
    ChatWriteForbiddenError,
    FloodWaitError,
    UserBannedInChannelError,
)

from app.core.config import get_settings
from app.db.models import Campaign, Group, PostingLog
from app.services.telegram_service import TelegramService


logger = logging.getLogger(__name__)

_settings = get_settings()
_post_semaphore = asyncio.Semaphore(_settings.max_post_workers)

MAX_ATTEMPTS: int = 3
_RETRY_DELAYS: tuple[int, ...] = (5, 20)


@dataclass
class SendResult:
    group: Group
    success: bool
    telegram_message_id: int | None = None
    error: str | None = None
    attempts: int = 1


def _resolve_media(media_path: str | None, media_type: str) -> str | None:
    if not media_path:
        return None
    p = Path(media_path)
    if not p.exists():
        logger.warning("Media file not found, sending text only: %s", media_path)
        return None
    if media_type == "video":
        mime, _ = mimetypes.guess_type(str(p))
        if mime and not mime.startswith("video/"):
            logger.warning("media_type=video but MIME is %s for %s", mime, p.name)
    return str(p)


async def _handle_flood_wait(exc: FloodWaitError, attempt: int) -> None:
    wait = exc.seconds + 2
    logger.warning("FloodWaitError: Telegram asks to wait %d s (attempt %d). Sleeping...", wait, attempt)
    await asyncio.sleep(wait)


def _is_permanent_error(exc: Exception) -> bool:
    return isinstance(exc, (ChannelPrivateError, ChatWriteForbiddenError, UserBannedInChannelError))


async def _send_to_group(
    telegram: TelegramService,
    group: Group,
    campaign: Campaign,
) -> SendResult:
    media = _resolve_media(campaign.media_path, campaign.media_type)
    last_error: str | None = None
    attempts = 0

    for attempt, next_delay in enumerate((*_RETRY_DELAYS, None), start=1):
        attempts = attempt
        try:
            if campaign.forward_from_chat and campaign.forward_from_message_id:
                client = await telegram.ensure_connected()
                dest = await telegram.resolve_entity(group.chat_identifier)
                source = await telegram.resolve_entity(campaign.forward_from_chat)
                fwd = await client.forward_messages(
                    entity=dest,
                    messages=campaign.forward_from_message_id,
                    from_peer=source,
                )
                fwd_msg_id = fwd.id if hasattr(fwd, "id") else (fwd[0].id if fwd else None)
                logger.info(
                    "Campaign %d | group %-30s | attempt %d | forwarded msg %d from %s -> msg_id=%s",
                    campaign.id, group.chat_identifier, attempt,
                    campaign.forward_from_message_id, campaign.forward_from_chat, fwd_msg_id,
                )
                return SendResult(group=group, success=True, telegram_message_id=fwd_msg_id, attempts=attempts)

            sent = await telegram.send_message(
                chat_identifier=group.chat_identifier,
                message=campaign.message_text,
                parse_mode=campaign.parse_mode,
                media_path=media,
            )
            logger.info(
                "Campaign %d | group %-30s | attempt %d | sent msg_id=%d",
                campaign.id, group.chat_identifier, attempt, sent.id,
            )
            return SendResult(group=group, success=True, telegram_message_id=sent.id, attempts=attempts)

        except FloodWaitError as exc:
            await _handle_flood_wait(exc, attempt)
            last_error = f"FloodWaitError({exc.seconds}s)"

        except Exception as exc:  # noqa: BLE001
            last_error = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "Campaign %d | group %-30s | attempt %d failed: %s",
                campaign.id, group.chat_identifier, attempt, last_error,
                exc_info=True,
            )
            if _is_permanent_error(exc):
                logger.error(
                    "Campaign %d | group %s | permanent error, no retry: %s",
                    campaign.id, group.chat_identifier, last_error,
                )
                break

        if next_delay is not None:
            await asyncio.sleep(next_delay)

    logger.error(
        "Campaign %d | group %-30s | all %d attempts exhausted. Last error: %s",
        campaign.id, group.chat_identifier, attempts, last_error,
    )
    return SendResult(group=group, success=False, error=last_error, attempts=attempts)


async def send_campaign_to_groups(
    telegram: TelegramService,
    db: Session,
    campaign: Campaign,
    groups: list[Group],
) -> list[SendResult]:
    results: list[SendResult] = []

    for idx, group in enumerate(groups):
        async with _post_semaphore:
            result = await _send_to_group(telegram, group, campaign)
            results.append(result)

            if result.success:
                db.add(PostingLog(
                    campaign_id=campaign.id,
                    group_id=group.id,
                    status="success",
                    telegram_message_id=result.telegram_message_id,
                ))
            else:
                db.add(PostingLog(
                    campaign_id=campaign.id,
                    group_id=group.id,
                    status="failed",
                    error_message=result.error,
                ))
            db.flush()

        if idx < len(groups) - 1 and campaign.inter_group_delay_secs > 0:
            await asyncio.sleep(campaign.inter_group_delay_secs)

    sent = sum(1 for r in results if r.success)
    failed = len(results) - sent
    logger.info(
        "Campaign %d dispatch complete: %d sent, %d failed across %d groups",
        campaign.id, sent, failed, len(groups),
    )
    return results
