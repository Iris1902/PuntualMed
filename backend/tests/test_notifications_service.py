import uuid
from datetime import UTC, datetime, timedelta

from app.notifications.models import ContactLinkToken, FamilyContact
from app.notifications.service import NotificationService


class _Contacts:
    def __init__(self) -> None:
        self.items: list[FamilyContact] = []

    async def add(self, contact: FamilyContact) -> FamilyContact:
        self.items.append(contact)
        return contact

    async def list_by_user(self, user_id):
        return [c for c in self.items if c.user_id == user_id]

    async def get_for_user(self, contact_id, user_id):
        return next((c for c in self.items if c.id == contact_id and c.user_id == user_id), None)

    async def delete(self, contact):
        self.items.remove(contact)


class _Tokens:
    def __init__(self, existing=None) -> None:
        self.items = list(existing or [])

    async def add(self, token):
        self.items.append(token)
        return token

    async def get_by_token(self, token):
        return next((t for t in self.items if t.token == token), None)


class _Telegram:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []

    async def send_message(self, chat_id, text):
        self.sent.append((chat_id, text))


class _Settings:
    telegram_bot_username = "PuntualMedBot"
    link_token_ttl_minutes = 60


def _now():
    return datetime(2026, 6, 20, 12, 0, tzinfo=UTC)


USER = uuid.uuid4()


async def test_create_link_persists_token_and_builds_deep_link() -> None:
    tokens = _Tokens()
    svc = NotificationService(_Contacts(), tokens, _Telegram(), _Settings(), now_fn=_now)
    result = await svc.create_link(USER)
    assert len(tokens.items) == 1
    assert result["deep_link"].startswith("https://t.me/PuntualMedBot?start=")
    assert result["deep_link"].endswith(tokens.items[0].token)


async def test_handle_update_links_contact_for_valid_token() -> None:
    token = ContactLinkToken(
        id=uuid.uuid4(),
        token="abc",
        user_id=USER,
        expires_at=_now() + timedelta(minutes=30),
        used=False,
    )
    contacts, tg = _Contacts(), _Telegram()
    svc = NotificationService(contacts, _Tokens([token]), tg, _Settings(), now_fn=_now)
    update = {"message": {"text": "/start abc", "chat": {"id": 999, "first_name": "Mama"}}}
    ok = await svc.handle_update(update)
    assert ok is True
    assert contacts.items[0].user_id == USER
    assert contacts.items[0].chat_id == "999"
    assert token.used is True
    assert tg.sent  # confirmacion enviada


async def test_handle_update_rejects_used_or_expired_token() -> None:
    expired = ContactLinkToken(
        id=uuid.uuid4(),
        token="old",
        user_id=USER,
        expires_at=_now() - timedelta(minutes=1),
        used=False,
    )
    contacts = _Contacts()
    svc = NotificationService(contacts, _Tokens([expired]), _Telegram(), _Settings(), now_fn=_now)
    ok = await svc.handle_update({"message": {"text": "/start old", "chat": {"id": 1}}})
    assert ok is False
    assert contacts.items == []


async def test_handle_update_ignores_non_start() -> None:
    svc = NotificationService(_Contacts(), _Tokens(), _Telegram(), _Settings(), now_fn=_now)
    assert await svc.handle_update({"message": {"text": "hola", "chat": {"id": 1}}}) is False
