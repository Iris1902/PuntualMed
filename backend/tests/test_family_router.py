import uuid
from datetime import UTC, datetime

from app.core.security import CurrentUser, get_current_user
from app.notifications.models import FamilyContact
from app.notifications.router import get_notification_service
from app.notifications.service import NotificationService

_USER_ID = uuid.uuid4()
_NOW = datetime(2026, 6, 20, 12, 0, tzinfo=UTC)
_EXPIRES = datetime(2026, 6, 20, 13, 0, tzinfo=UTC)


class _FakeContactRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, FamilyContact] = {}

    async def add(self, contact: FamilyContact) -> FamilyContact:
        if contact.created_at is None:
            contact.created_at = _NOW
        self.store[contact.id] = contact
        return contact

    async def list_by_user(self, user_id: uuid.UUID) -> list[FamilyContact]:
        return [c for c in self.store.values() if c.user_id == user_id]

    async def get_for_user(
        self, contact_id: uuid.UUID, user_id: uuid.UUID
    ) -> FamilyContact | None:
        c = self.store.get(contact_id)
        return c if c is not None and c.user_id == user_id else None

    async def delete(self, contact: FamilyContact) -> None:
        self.store.pop(contact.id, None)


class _FakeTokenRepo:
    async def add(self, token):
        return token

    async def get_by_token(self, token: str):
        return None


class _FakeTelegram:
    async def send_message(self, chat_id: str, text: str) -> None:
        pass


class _FakeSettings:
    telegram_bot_token = None
    telegram_bot_username = "puntualmed_bot"
    link_token_ttl_minutes = 60


def _make_service(contacts_repo=None, tokens_repo=None) -> NotificationService:
    return NotificationService(
        contacts_repo or _FakeContactRepo(),
        tokens_repo or _FakeTokenRepo(),
        _FakeTelegram(),
        _FakeSettings(),
        now_fn=lambda: _NOW,
    )


def _seed(repo: _FakeContactRepo, user_id: uuid.UUID) -> FamilyContact:
    contact = FamilyContact(
        id=uuid.uuid4(),
        user_id=user_id,
        chat_id="123456",
        display_name="Mama",
        created_at=_NOW,
    )
    repo.store[contact.id] = contact
    return contact


def _wire(app, service: NotificationService) -> None:
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=_USER_ID, email="iris@example.com"
    )
    app.dependency_overrides[get_notification_service] = lambda: service


async def test_post_link_returns_deep_link(app, client):
    service = _make_service()
    _wire(app, service)
    try:
        response = await client.post("/api/v1/family/link")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert "deep_link" in body
    assert "puntualmed_bot" in body["deep_link"]
    assert "expires_at" in body


async def test_get_contacts_returns_only_owned(app, client):
    contacts_repo = _FakeContactRepo()
    _seed(contacts_repo, _USER_ID)
    _seed(contacts_repo, uuid.uuid4())  # otro usuario
    service = _make_service(contacts_repo=contacts_repo)
    _wire(app, service)
    try:
        response = await client.get("/api/v1/family/contacts")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["display_name"] == "Mama"


async def test_delete_contact_204(app, client):
    contacts_repo = _FakeContactRepo()
    contact = _seed(contacts_repo, _USER_ID)
    service = _make_service(contacts_repo=contacts_repo)
    _wire(app, service)
    try:
        response = await client.delete(f"/api/v1/family/contacts/{contact.id}")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 204


async def test_delete_foreign_contact_404(app, client):
    contacts_repo = _FakeContactRepo()
    foreign = _seed(contacts_repo, uuid.uuid4())
    service = _make_service(contacts_repo=contacts_repo)
    _wire(app, service)
    try:
        response = await client.delete(f"/api/v1/family/contacts/{foreign.id}")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_family_endpoints_without_token_401(app, client):
    response = await client.get("/api/v1/family/contacts")
    assert response.status_code == 401
