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
    def _candidate_bare_ids(parsed: int) -> set[int]:
        """
        Given a marked Telegram ID (e.g. -1005171956177), return all possible
        bare IDs it could correspond to.  We can't always know whether the
        entity is a Channel or a basic Chat just from the number, so we
        return both interpretations and match whichever one the dialog has.
        """
        candidates = set()
        candidates.add(abs(parsed))                          # |id|
        if parsed < -1_000_000_000_000:
            candidates.add(-parsed - 1_000_000_000_000)      # strip -100 prefix
        if parsed < 0:
            candidates.add(-parsed)                           # strip minus
        candidates.add(parsed)                                # as-is
        return candidates

    async def resolve_entity(self, chat_identifier: str):
        """
        Resolve a chat identifier to an InputPeer that Telethon can use directly.

        Returns ``dialog.input_entity`` — an InputPeerChannel / InputPeerChat /
        InputPeerUser already built by Telethon from the server response.
        This avoids struct-packing overflows when channel_id > 2^31.
        """
        client = await self.ensure_connected()
        parsed = self._parse_identifier(chat_identifier)

        # String identifiers (@username, invite links) — Telethon resolves natively
        if isinstance(parsed, str):
            try:
                return await client.get_entity(parsed)
            except (ValueError, TypeError):
                logger.info(
                    "String entity '%s' not found via get_entity, scanning dialogs...",
                    chat_identifier,
                )
                target_username = parsed.lstrip("@").lower()
                async for dialog in client.iter_dialogs():
                    uname = getattr(dialog.entity, "username", None)
                    if uname and uname.lower() == target_username:
                        logger.info("Resolved '%s' via dialog scan (username)", chat_identifier)
                        return dialog.input_entity
                raise ValueError(
                    f"Could not resolve entity for '{chat_identifier}'. "
                    "Make sure the Telegram account is a member of this group/channel."
                )

        # Numeric identifier — generate all possible bare IDs
        candidates = self._candidate_bare_ids(parsed)

        logger.info(
            "Scanning dialogs for numeric entity '%s' (candidates=%s)...",
            chat_identifier, candidates,
        )
        async for dialog in client.iter_dialogs():
            eid = getattr(dialog.entity, "id", None)
            if eid is not None and eid in candidates:
                logger.info(
                    "Resolved '%s' via dialog scan → %s (entity.id=%d, type=%s)",
                    chat_identifier, type(dialog.input_entity).__name__, eid,
                    type(dialog.entity).__name__,
                )
                return dialog.input_entity

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
