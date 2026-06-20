import uuid
from datetime import UTC, datetime

from app.ai.models import AiMessage
from app.ai.provider import DISCLAIMER
from app.ai.router import get_ai_service
from app.ai.service import AiService
from app.core.security import CurrentUser, get_current_user
from app.symptoms.models import Symptom

_USER_ID = uuid.uuid4()

# Sintoma de prueba: permite verificar que el filtrado por symptom_id funciona.
_SYMPTOM_ID = uuid.uuid4()
_OTHER_SYMPTOM_ID = uuid.uuid4()

_SYMPTOM = Symptom(
    id=_SYMPTOM_ID,
    user_id=_USER_ID,
    description="headache",
    severity="mild",
    occurred_at=datetime(2026, 1, 1, tzinfo=UTC),
)
_OTHER_SYMPTOM = Symptom(
    id=_OTHER_SYMPTOM_ID,
    user_id=_USER_ID,
    description="nausea",
    severity="moderate",
    occurred_at=datetime(2026, 1, 2, tzinfo=UTC),
)


class _FakeAiRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, AiMessage] = {}

    async def add(self, message):
        # Simula el server_default de created_at al persistir
        if message.created_at is None:
            message.created_at = datetime.now(UTC)
        self.store[message.id] = message
        return message


class _FakeSymptomRepo:
    def __init__(self, symptoms: list[Symptom] | None = None) -> None:
        # Mapa de id -> Symptom para lookup por get_for_user
        self._symptoms = symptoms or []

    async def list_by_user(self, user_id: uuid.UUID) -> list[Symptom]:
        return [s for s in self._symptoms if s.user_id == user_id]

    async def get_for_user(
        self, symptom_id: uuid.UUID, user_id: uuid.UUID
    ) -> Symptom | None:
        return next(
            (
                s
                for s in self._symptoms
                if s.id == symptom_id and s.user_id == user_id
            ),
            None,
        )


class _FakeMedRepo:
    async def list_by_user(self, user_id):
        return []


class _FakeProvider:
    def __init__(self, response: str) -> None:
        self.response = response
        # Captura los sintomas recibidos en el ultimo llamado
        self.last_symptoms: list[dict] = []

    async def analyze_symptoms(self, symptoms, meds):
        self.last_symptoms = list(symptoms)
        return self.response


def _wire(app, ai_repo, provider, symptom_repo=None):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=_USER_ID, email="iris@example.com"
    )
    app.dependency_overrides[get_ai_service] = lambda: AiService(
        provider, ai_repo, symptom_repo or _FakeSymptomRepo(), _FakeMedRepo()
    )


async def test_analyze_endpoint_returns_200_with_disclaimer(app, client):
    ai_repo = _FakeAiRepo()
    provider = _FakeProvider("Analisis sin aviso")  # sin disclaimer
    _wire(app, ai_repo, provider)
    try:
        response = await client.post("/api/v1/ai/symptoms/analyze")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "symptom_analysis"
    assert body["role"] == "assistant"
    assert DISCLAIMER in body["content"]
    assert len(ai_repo.store) == 1


async def test_analyze_without_token_returns_401(app, client):
    response = await client.post("/api/v1/ai/symptoms/analyze")
    assert response.status_code == 401


async def test_analyze_with_symptom_id_sends_only_that_symptom(app, client):
    ai_repo = _FakeAiRepo()
    provider = _FakeProvider(DISCLAIMER)
    symptom_repo = _FakeSymptomRepo(symptoms=[_SYMPTOM, _OTHER_SYMPTOM])
    _wire(app, ai_repo, provider, symptom_repo)
    try:
        response = await client.post(
            "/api/v1/ai/symptoms/analyze",
            json={"symptom_id": str(_SYMPTOM_ID)},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    # Solo el sintoma elegido debe llegar al provider, no ambos
    assert len(provider.last_symptoms) == 1
    assert provider.last_symptoms[0]["description"] == "headache"
