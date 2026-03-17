import asyncio
import logging
from dataclasses import dataclass

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.sessions import StringSession
from telethon.tl.custom.message import Message

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_RECONNECT_DELAYS = (2, 5, 10, 30, 60)


@dataclass
class LoginState:
    phone_number: str
    phone_code_hash: str


class TelegramService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: TelegramClient | None = None
        self._lock = asyncio.Lock()
        self._pending_login: LoginState | None = None

    async def init_client(self, string_session: str | None) -> None:
        async with self._lock:
            if self._client and self._client.is_connected():
                await self._client.disconnect()

            session = StringSession(string_session) if string_session else StringSession()
            self._client = TelegramClient(
                session=session,
                api_id=self.settings.telegram_api_id,
                api_hash=self.settings.telegram_api_hash,
                device_model=self.settings.telegram_device_model,
                system_version=self.settings.telegram_system_version,
                app_version=self.settings.telegram_app_version,
            )
            try:
                await asyncio.wait_for(self._client.connect(), timeout=15)
                logger.info("Telegram client initialized (authorized=%s)", await self._client.is_user_authorized())
            except Exception as exc:
                logger.warning("Telegram connect at startup failed (%s) — will retry on first request", exc)
                asyncio.get_running_loop().call_later(30, lambda: asyncio.ensure_future(self._reconnect_background()))

    async def _reconnect_background(self) -> None:
        for delay in _RECONNECT_DELAYS:
            try:
                if self._client and not self._client.is_connected():
                    await self._client.connect()
                if self._client and self._client.is_connected():
                    logger.info("Telegram background reconnect succeeded")
                    return
            except Exception as exc:
                logger.warning("Background reconnect failed (%s), retrying in %ds", exc, delay)
            await asyncio.sleep(delay)

    async def ensure_connected(self, timeout: float = 20) -> TelegramClient:
        if self._client is None:
            raise RuntimeError("Telegram client is not initialized. Call init_client() first.")

        if self._client.is_connected():
            return self._client

        try:
            await asyncio.wait_for(self._try_reconnect(), timeout=timeout)
        except asyncio.TimeoutError:
            raise RuntimeError(
                "Cannot reach Telegram servers (timed out after %ds). "
                "Check your internet connection or try using a VPN/proxy." % int(timeout)
            )

        if self._client.is_connected():
            return self._client
        raise RuntimeError("Telegram client could not reconnect. Check your network.")

    async def _try_reconnect(self) -> None:
        for attempt, delay in enumerate(_RECONNECT_DELAYS, start=1):
            try:
                logger.warning("Telegram disconnected — reconnect attempt %d", attempt)
                await self._client.connect()  # type: ignore[union-attr]
                if self._client and self._client.is_connected():
                    logger.info("Telegram reconnected successfully")
                    return
            except Exception as exc:
                logger.error("Reconnect attempt %d failed: %s", attempt, exc)
            await asyncio.sleep(delay)

    async def is_authorized(self) -> bool:
        if self._client is None or not self._client.is_connected():
            return False
        try:
            return await self._client.is_user_authorized()
        except Exception:
            return False

    async def get_me(self) -> dict[str, str | None]:
        if self._client is None or not self._client.is_connected():
            return {"username": None, "phone": None}
        try:
            if not await self._client.is_user_authorized():
                return {"username": None, "phone": None}
            me = await self._client.get_me()
            return {"username": me.username, "phone": me.phone}
        except Exception:
            return {"username": None, "phone": None}

    async def start_login(self, phone_number: str) -> None:
        client = await self.ensure_connected()
        sent = await client.send_code_request(phone_number)
        self._pending_login = LoginState(phone_number=phone_number, phone_code_hash=sent.phone_code_hash)
        logger.info("Telegram login code sent to %s", phone_number)

    async def verify_login(self, phone_number: str, code: str, password: str | None) -> tuple[bool, str]:
        client = await self.ensure_connected()
        if not self._pending_login:
            raise ValueError("No pending login request — call start_login() first")
        if self._pending_login.phone_number != phone_number:
            raise ValueError("Phone number does not match the pending login request")

        try:
            await client.sign_in(
                phone=self._pending_login.phone_number,
                code=code,
                phone_code_hash=self._pending_login.phone_code_hash,
            )
            self._pending_login = None
            logger.info("Telegram account authorized for %s", phone_number)
            return True, "authorized"
        except SessionPasswordNeededError:
            if not password:
                return False, "password_required"
            await client.sign_in(password=password)
            self._pending_login = None
            logger.info("Telegram account authorized via 2FA for %s", phone_number)
            return True, "authorized"

    async def export_session(self) -> str:
        client = await self.ensure_connected()
        if not await client.is_user_authorized():
            raise RuntimeError("Cannot export session — Telegram user is not authorized")
        return client.session.save()

    async def join_group(self, identifier: str) -> dict:
        client = await self.ensure_connected()
        if not await client.is_user_authorized():
            raise RuntimeError("Cannot join group — Telegram user is not authorized")

        from telethon.tl.functions.channels import JoinChannelRequest
        from telethon.tl.functions.messages import ImportChatInviteRequest

        if "/+" in identifier or "/joinchat/" in identifier:
            invite_hash = identifier.split("/")[-1].lstrip("+")
            result = await client(ImportChatInviteRequest(invite_hash))
            chat = result.chats[0]
        else:
            entity = await client.get_entity(identifier)
            result = await client(JoinChannelRequest(entity))
            chat = result.chats[0] if result.chats else entity

        from telethon.tl.types import Channel as TelegramChannel

        title = getattr(chat, "title", str(chat.id))
        username = getattr(chat, "username", None)
        # Store channels/supergroups with the -100 prefix so Telethon resolves them correctly
        if isinstance(chat, TelegramChannel):
            chat_id = -1_000_000_000_000 - chat.id
        else:
            chat_id = -chat.id  # basic group already negative
        logger.info("Joined group: %s (id=%d)", title, chat_id)
        return {"title": title, "chat_id": chat_id, "username": username}

    @staticmethod
    def _parse_identifier(chat_identifier: str) -> str | int:
        """Convert numeric string IDs to int so Telethon resolves them correctly."""
        stripped = chat_identifier.strip()
        try:
            return int(stripped)
        except ValueError:
            return stripped

    @staticmethod
    def _bare_id(parsed: str | int) -> int | None:
        """
        Return the bare (non-prefixed) integer ID used by Telethon internally.
        Supergroups/channels stored as -100XXXXXXXXXX → strip the -100 prefix.
        Basic groups stored as -XXXXXXXXX → strip the minus sign.
        """
        if not isinstance(parsed, int):
            return None
        if parsed < -1_000_000_000_000:
            return -parsed - 1_000_000_000_000   # supergroup/channel
        if parsed < 0:
            return -parsed                        # basic group
        return parsed                             # user

    async def resolve_entity(self, chat_identifier: str):
        """
        Resolve a chat identifier to a Telethon InputPeer/entity.

        Strategy:
        1. Fast path — try get_entity() which hits the in-memory session cache.
        2. Slow path — iterate ALL dialogs and match by bare entity ID or username
           directly from the dialog object (no second cache lookup).  This always
           works for any group the logged-in account is a member of.
        """
        client = await self.ensure_connected()
        parsed = self._parse_identifier(chat_identifier)

        # Fast path
        try:
            return await client.get_entity(parsed)
        except (ValueError, TypeError):
            logger.info("Entity '%s' not in session cache — scanning dialogs...", chat_identifier)

        # Slow path: scan every dialog and match directly
        target_bare = self._bare_id(parsed)
        target_username = parsed.lstrip("@").lower() if isinstance(parsed, str) else None

        async for dialog in client.iter_dialogs():
            entity = dialog.entity
            eid = getattr(entity, "id", None)

            if target_bare is not None and eid == target_bare:
                logger.info("Resolved entity '%s' via dialog scan (bare_id=%d)", chat_identifier, eid)
                return entity

            if target_username is not None:
                uname = getattr(entity, "username", None)
                if uname and uname.lower() == target_username:
                    logger.info("Resolved entity '%s' via dialog scan (username=%s)", chat_identifier, uname)
                    return entity

        raise ValueError(
            f"Could not resolve entity for '{chat_identifier}'. "
            "Make sure the logged-in Telegram account is a member of this group/channel."
        )

    async def send_message(
        self,
        chat_identifier: str,
        message: str,
        parse_mode: str = "html",
        media_path: str | None = None,
    ) -> Message:
        client = await self.ensure_connected()
        if not await client.is_user_authorized():
            raise RuntimeError("Cannot send message — Telegram user is not authorized")
        selected_parse_mode = "markdown" if parse_mode == "md" else "html"
        entity = await self.resolve_entity(chat_identifier)
        return await client.send_message(
            entity=entity,
            message=message,
            parse_mode=selected_parse_mode,
            file=media_path,
            link_preview=False,
        )

    async def disconnect(self) -> None:
        if self._client and self._client.is_connected():
            await self._client.disconnect()
            logger.info("Telegram client disconnected")
