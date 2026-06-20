import uuid
from datetime import UTC, date, datetime

from app.core.security import CurrentUser, get_current_user
from app.meds.models import Medication
from app.meds.router import get_medication_service
from app.meds.service import MedicationService
from app.reminders.router import get_intake_service
from app.reminders.service import IntakeService

_USER_ID = uuid.uuid4()


class _FakeIntakeRepo:
    def __init__(self) -> None:
        self.store = {}

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
        return [i for i in self.store.values() if i.user_id == user_id]


class _FakeRepo:
    def __init__(self) -> None:
        self._store: dict[uuid.UUID, Medication] = {}

    async def add(self, medication):
        # Simula los defaults que el motor aplica al persistir (created_at via
        # server_default + RETURNING, active via default). Sin esto, un objeto
        # transitorio recien creado tendria created_at/active en None y
        # MedicationRead no serializaria.
        if medication.created_at is None:
            medication.created_at = datetime(2026, 1, 1, tzinfo=UTC)
        if medication.active is None:
            medication.active = True
        self._store[medication.id] = medication
        return medication

    async def list_by_user(self, user_id):
        return [m for m in self._store.values() if m.user_id == user_id]

    async def get_for_user(self, medication_id, user_id):
        med = self._store.get(medication_id)
        if med is None or med.user_id != user_id:
            return None
        return med

    async def delete(self, medication):
        self._store.pop(medication.id, None)


def _seed_medication(repo: _FakeRepo, user_id: uuid.UUID) -> Medication:
    med = Medication(
        id=uuid.uuid4(),
        user_id=user_id,
        name="Paracetamol",
        dose="500 mg",
        frequency_hours=8,
        start_date=date(2026, 1, 1),
        duration_days=7,
        end_date=date(2026, 1, 8),
        notes=None,
        source="manual",
        active=True,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
        schedules=[],
    )
    repo._store[med.id] = med
    return med


def _override_auth():
    return CurrentUser(id=_USER_ID, email="iris@example.com")


def _wire(app, repo):
    app.dependency_overrides[get_current_user] = _override_auth
    app.dependency_overrides[get_medication_service] = lambda: MedicationService(repo)
    app.dependency_overrides[get_intake_service] = lambda: IntakeService(_FakeIntakeRepo())


async def test_create_medication_returns_201(app, client):
    repo = _FakeRepo()
    _wire(app, repo)
    try:
        response = await client.post(
            "/api/v1/medications",
            json={
                "name": "Paracetamol",
                "dose": "500 mg",
                "start_date": "2026-01-01",
                "duration_days": 7,
                "schedules": [{"time_of_day": "08:00:00"}],
            },
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 201
    body = response.json()
    assert body["end_date"] == "2026-01-08"
    assert body["source"] == "manual"
    assert len(body["schedules"]) == 1


async def test_list_medications_returns_only_owned(app, client):
    repo = _FakeRepo()
    _seed_medication(repo, _USER_ID)
    _seed_medication(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/medications")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_get_medication_404_for_other_owner(app, client):
    repo = _FakeRepo()
    foreign = _seed_medication(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.get(f"/api/v1/medications/{foreign.id}")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_delete_medication_204_then_404(app, client):
    repo = _FakeRepo()
    med = _seed_medication(repo, _USER_ID)
    _wire(app, repo)
    try:
        first = await client.delete(f"/api/v1/medications/{med.id}")
        second = await client.delete(f"/api/v1/medications/{med.id}")
    finally:
        app.dependency_overrides.clear()
    assert first.status_code == 204
    assert second.status_code == 404


async def test_add_schedule_returns_201(app, client):
    repo = _FakeRepo()
    med = _seed_medication(repo, _USER_ID)
    _wire(app, repo)
    try:
        response = await client.post(
            f"/api/v1/medications/{med.id}/schedules",
            json={"time_of_day": "20:00:00"},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 201
    assert response.json()["time_of_day"] == "20:00:00"


async def test_medications_without_token_returns_401(app, client):
    response = await client.get("/api/v1/medications")
    assert response.status_code == 401


async def test_patch_medication_404_for_other_owner(app, client):
    repo = _FakeRepo()
    foreign = _seed_medication(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.patch(
            f"/api/v1/medications/{foreign.id}", json={"name": "Hackeado"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_list_schedules_404_for_other_owner(app, client):
    repo = _FakeRepo()
    foreign = _seed_medication(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.get(f"/api/v1/medications/{foreign.id}/schedules")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_create_medication_generates_intakes(app, client):
    repo = _FakeRepo()
    intake_repo = _FakeIntakeRepo()
    app.dependency_overrides[get_current_user] = _override_auth
    app.dependency_overrides[get_medication_service] = lambda: MedicationService(repo)
    app.dependency_overrides[get_intake_service] = lambda: IntakeService(intake_repo)
    try:
        response = await client.post(
            "/api/v1/medications",
            json={
                "name": "Paracetamol", "dose": "500 mg", "start_date": "2026-06-19",
                "duration_days": 7,
                "schedules": [{"time_of_day": "08:00:00"}, {"time_of_day": "20:00:00"}],
            },
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 201
    # 7 dias x 2 horarios = 14 tomas generadas
    assert len(intake_repo.store) == 14
    assert all(i.user_id == _USER_ID for i in intake_repo.store.values())
