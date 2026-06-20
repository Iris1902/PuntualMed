import uuid
from datetime import UTC, datetime

from app.core.security import CurrentUser, get_current_user
from app.symptoms.models import Symptom
from app.symptoms.router import get_symptom_service
from app.symptoms.service import SymptomService

_USER_ID = uuid.uuid4()


class _FakeSymptomRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, Symptom] = {}

    async def add(self, symptom):
        # Simula el server_default de created_at que el motor aplica al persistir.
        if symptom.created_at is None:
            symptom.created_at = datetime.now(UTC)
        self.store[symptom.id] = symptom
        return symptom

    async def list_by_user(self, user_id):
        items = [s for s in self.store.values() if s.user_id == user_id]
        return sorted(items, key=lambda s: s.occurred_at, reverse=True)


class _FakeMedRepo:
    def __init__(self, owned=None) -> None:
        self.owned = owned or {}

    async def get_for_user(self, medication_id, user_id):
        return self.owned.get((medication_id, user_id))


def _seed(repo, user_id, description="Mareo") -> Symptom:
    symptom = Symptom(
        id=uuid.uuid4(), user_id=user_id, description=description,
        occurred_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC),
        created_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC),
    )
    repo.store[symptom.id] = symptom
    return symptom


def _wire(app, repo, med_repo=None):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=_USER_ID, email="iris@example.com"
    )
    app.dependency_overrides[get_symptom_service] = lambda: SymptomService(
        repo, med_repo or _FakeMedRepo()
    )


async def test_create_symptom_returns_201(app, client):
    repo = _FakeSymptomRepo()
    _wire(app, repo)
    try:
        response = await client.post(
            "/api/v1/symptoms", json={"description": "Nausea", "severity": "leve"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Nausea"
    assert body["severity"] == "leve"
    assert body["medication_id"] is None


async def test_create_symptom_invalid_severity_422(app, client):
    repo = _FakeSymptomRepo()
    _wire(app, repo)
    try:
        response = await client.post(
            "/api/v1/symptoms", json={"description": "x", "severity": "altisimo"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 422


async def test_create_symptom_foreign_medication_404(app, client):
    repo = _FakeSymptomRepo()
    _wire(app, repo, _FakeMedRepo())  # ningun med pertenece al user
    try:
        response = await client.post(
            "/api/v1/symptoms",
            json={"description": "Erupcion", "medication_id": str(uuid.uuid4())},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


async def test_list_symptoms_returns_only_owned(app, client):
    repo = _FakeSymptomRepo()
    _seed(repo, _USER_ID)
    _seed(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.get("/api/v1/symptoms")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_symptoms_without_token_returns_401(app, client):
    response = await client.get("/api/v1/symptoms")
    assert response.status_code == 401


# --- Fake repo and helpers for get_for_user / delete ---

class _FakeSymptomRepoWithOwner(_FakeSymptomRepo):
    async def get_for_user(self, symptom_id, user_id):
        s = self.store.get(symptom_id)
        return s if s is not None and s.user_id == user_id else None

    async def delete(self, symptom):
        self.store.pop(symptom.id, None)


# --- PATCH tests ---

async def test_patch_symptom_returns_200_with_updated_description(app, client):
    repo = _FakeSymptomRepoWithOwner()
    symptom = _seed(repo, _USER_ID, description="Mareo")
    _wire(app, repo)
    try:
        response = await client.patch(
            f"/api/v1/symptoms/{symptom.id}", json={"description": "Nausea"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["description"] == "Nausea"


async def test_patch_symptom_404_for_other_owner(app, client):
    repo = _FakeSymptomRepoWithOwner()
    foreign = _seed(repo, uuid.uuid4(), description="Dolor ajeno")
    _wire(app, repo)
    try:
        response = await client.patch(
            f"/api/v1/symptoms/{foreign.id}", json={"description": "Hackeado"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404


# --- DELETE tests ---

async def test_delete_symptom_204_then_404(app, client):
    repo = _FakeSymptomRepoWithOwner()
    symptom = _seed(repo, _USER_ID)
    _wire(app, repo)
    try:
        first = await client.delete(f"/api/v1/symptoms/{symptom.id}")
        second = await client.delete(f"/api/v1/symptoms/{symptom.id}")
    finally:
        app.dependency_overrides.clear()
    assert first.status_code == 204
    assert second.status_code == 404


async def test_delete_symptom_404_for_other_owner(app, client):
    repo = _FakeSymptomRepoWithOwner()
    foreign = _seed(repo, uuid.uuid4())
    _wire(app, repo)
    try:
        response = await client.delete(f"/api/v1/symptoms/{foreign.id}")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 404
