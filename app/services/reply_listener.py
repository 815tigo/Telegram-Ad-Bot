import logging
from collections.abc import Callable

from sqlalchemy import select
from telethon import events

from app.core.config import get_settings
from app.db.models import PostingLog, Reply

logger = logging.getLogger(__name__)


class ReplyListener:
    def __init__(self) -> None:
        self._handler = None
        self._db_factory: Callable | None = None
        self._telegram_service = None

    def start(self, telegram_service, db_factory: Callable) -> None:
        self._db_factory = db_factory
        self._telegram_service = telegram_service

        if telegram_service._client is None:
            logger.warning("ReplyListener: Telegram client not ready, cannot register handler")
            return

        async def on_new_message(event: events.NewMessage.Event) -> None:
            if not event.message.reply_to_msg_id:
                return
            await self._handle_reply(event)

        self._handler = on_new_message
        telegram_service._client.add_event_handler(on_new_message, events.NewMessage)
        logger.info("ReplyListener: event handler registered")

    def stop(self, telegram_service) -> None:
        if self._handler and telegram_service and telegram_service._client:
            try:
                telegram_service._client.remove_event_handler(self._handler, events.NewMessage)
            except Exception:  # noqa: BLE001
                pass
        self._handler = None
        logger.info("ReplyListener: event handler removed")

    async def _handle_reply(self, event: events.NewMessage.Event) -> None:
        if self._db_factory is None:
            return
        replied_to_msg_id: int = event.message.reply_to_msg_id

        db = self._db_factory()
        try:
            log_entry = db.scalars(
                select(PostingLog).where(PostingLog.telegram_message_id == replied_to_msg_id)
            ).first()
            if log_entry is None:
                return

            sender = await event.get_sender()
            from_user_id: int | None = sender.id if sender else None
            from_username: str | None = getattr(sender, "username", None) if sender else None

            reply = Reply(
                campaign_id=log_entry.campaign_id,
                group_id=log_entry.group_id,
                telegram_message_id=event.message.id,
                replied_to_message_id=replied_to_msg_id,
                from_user_id=from_user_id,
                from_username=from_username,
                text=event.message.text or None,
            )
            db.add(reply)
            db.commit()

            logger.info(
                "ReplyListener: reply captured from %s -> campaign=%d group=%d",
                from_username or from_user_id, log_entry.campaign_id, log_entry.group_id,
            )

            await self._maybe_forward_to_admin(event, log_entry.campaign_id, log_entry.group_id)

        except Exception:  # noqa: BLE001
            logger.exception("ReplyListener: error processing reply event")
            db.rollback()
        finally:
            db.close()

    async def _maybe_forward_to_admin(
        self,
        event: events.NewMessage.Event,
        campaign_id: int,
        group_id: int,
    ) -> None:
        settings = get_settings()
        forward_chat = settings.reply_forward_chat
        if not forward_chat or self._telegram_service is None:
            return

        try:
            client = await self._telegram_service.ensure_connected()
            header = (
                f"**New reply to ad**\n"
                f"Campaign ID: `{campaign_id}` | Group ID: `{group_id}`\n"
                f"From: {event.message.sender_id}"
            )
            await client.send_message(forward_chat, header, parse_mode="markdown")
            await client.forward_messages(
                entity=forward_chat,
                messages=event.message.id,
                from_peer=event.chat_id,
            )
            logger.info(
                "ReplyListener: forwarded reply to admin chat %s (campaign=%d)",
                forward_chat, campaign_id,
            )
        except Exception:  # noqa: BLE001
            logger.exception("ReplyListener: failed to forward reply to admin chat %s", forward_chat)
