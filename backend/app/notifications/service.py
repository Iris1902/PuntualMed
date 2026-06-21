import secrets
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from app.notifications.models import ContactLinkToken, FamilyContact


class NotificationService:
    def __init__(
        self,
        contacts_repo: Any,
        tokens_repo: Any,
        telegram: Any,
        settings: Any,
        now_fn: Callable[[], datetime] | None = None,
    ) -> None:
        self._contacts = contacts_repo
        self._tokens = tokens_repo
        self._telegram = telegram
        self._settings = settings
        self._now = now_fn or (lambda: datetime.now(UTC))

    async def create_link(self, user_id: uuid.UUID) -> dict:
        token = secrets.token_urlsafe(16)
        expires_at = self._now() + timedelta(minutes=self._settings.link_token_ttl_minutes)
        await self._tokens.add(
            ContactLinkToken(
                id=uuid.uuid4(),
                token=token,
                user_id=user_id,
                expires_at=expires_at,
                used=False,
            )
        )
        username = self._settings.telegram_bot_username
        return {
            "deep_link": f"https://t.me/{username}?start={token}",
            "expires_at": expires_at.isoformat(),
        }

    async def handle_update(self, update: dict) -> bool:
        message = update.get("message") or {}
        text = (message.get("text") or "").strip()
        chat = message.get("chat") or {}

        if not text.startswith("/start "):
            return False

        raw_token = text.split(" ", 1)[1].strip()
        record = await self._tokens.get_by_token(raw_token)

        # Rechazar si no existe, ya fue usado, o expiró
        if record is None or record.used or record.expires_at < self._now():
            return False

        await self._contacts.add(
            FamilyContact(
                id=uuid.uuid4(),
                user_id=record.user_id,
                chat_id=str(chat.get("id")),
                display_name=chat.get("first_name"),
            )
        )
        record.used = True
        await self._telegram.send_message(
            str(chat.get("id")),
            "Vinculado. Recibiras un aviso si no se confirma una toma.",
        )
        return True

    async def list_contacts(self, user_id: uuid.UUID) -> list[FamilyContact]:
        return await self._contacts.list_by_user(user_id)

    async def delete_contact(self, user_id: uuid.UUID, contact_id: uuid.UUID) -> bool:
        contact = await self._contacts.get_for_user(contact_id, user_id)
        if contact is None:
            return False
        await self._contacts.delete(contact)
        return True
