import uuid
from datetime import UTC, datetime

from app.core.security import CurrentUser, get_current_user
from app.reminders.models import IntakeLog
from app.reminders.router import get_intake_service
from app.reminders.service import IntakeService

_USER_ID = uuid.uuid4()


class _FakeRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, IntakeLog] = {}
        # Inicializado a None; se actualiza en cada llamada a list_for_user
        self.last_call: dict | None = None

    async def add(self, intake):
        self.store[intake.id] = intake
        return intake

    async def add_many(self, intakes):
        for i in intakes:
            self.store[i.id] = i
        return intakes

    async def get_for_user(self, intake_id, user_id):
        i = self.store.get(intake_id)
        return i if i and i.user_id == user_id else None

    async def list_for_user(self, user_id, lower, upper, status):
        # Registra los argumentos de la ultima llamada para verificacion en tests
        self.last_call = {"lower": lower, "upper": upper, "status": status}
        items = [i for i in self.store.values() if i.user_id == user_id]
        if status is not None:
            items = [i for i in items if i.status == status]
        return sorted(items, key=lambda i: i.scheduled_at)


def _seed(repo, user_id, status="pending") -> IntakeLog:
    intake = IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=uuid.uuid4(),
        scheduled_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC), status=status,
    )
    repo.store[intake.id] = intake
    return intake


def _wire(app, repo):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=_USER_ID, email="iris@example.com"
    )
    app.dependency_overrides[get_intake_service] = lambda: IntakeService(repo)


async def test_list_intakes_returns_only_owned(app, client):
    repo = _FakeRepo()
    _seed(repo, _USER_ID)
    _seed(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/intakes")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_list_intakes_filters_by_status(app, client):
    repo = _FakeRepo()
    _seed(repo, _USER_ID, status="pending")
    _seed(repo, _USER_ID, status="taken")
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/intakes?status=taken")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "taken"


async def test_list_intakes_rejects_invalid_status(app, client):
    repo = _FakeRepo()
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/intakes?status=bogus")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 422


async def test_confirm_intake_sets_taken(app, client):
    repo = _FakeRepo()
    intake = _seed(repo, _USER_ID)
    _wire(app, repo)
    try:
        response = await client.post(
            f"/api/v1/intakes/{intake.id}/confirm", json={"photo_url": "https://x/p.jpg"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "taken"
    assert body["photo_url"] == "https://x/p.jpg"


async def test_confirm_intake_404_for_other_owner(app, client):
    repo = _FakeRepo()
    foreign = _seed(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.post(f"/api/v1/intakes/{foreign.id}/confirm", json={})
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_intakes_without_token_returns_401(app, client):
    response = await client.get("/api/v1/intakes")
    assert response.status_code == 401


async def test_list_intakes_forwards_date_filters(app, client):
    repo = _FakeRepo()
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/intakes?from_date=2026-06-19&to_date=2026-06-20")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    # Verifica que el servicio convirtio las fechas a bounds tz-aware y los paso al repo
    assert repo.last_call is not None
    assert repo.last_call["lower"] is not None
    assert repo.last_call["upper"] is not None
    assert repo.last_call["lower"] < repo.last_call["upper"]
