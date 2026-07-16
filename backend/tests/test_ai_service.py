import uuid
from io import BytesIO
from types import SimpleNamespace

from PIL import Image, ImageDraw

from app.ai.models import AiMessage
from app.ai.provider import DISCLAIMER
from app.ai.service import AiService
from app.meds.models import Medication
from app.symptoms.models import Symptom


class _FakeAiRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, AiMessage] = {}

    async def add(self, message):
        self.store[message.id] = message
        return message


class _FakeSymptomRepo:
    def __init__(self, items=None) -> None:
        self._items = items or []
        self.calls: list[uuid.UUID] = []

    async def list_by_user(self, user_id):
        self.calls.append(user_id)
        return self._items


class _FakeMedRepo:
    def __init__(self, items=None) -> None:
        self._items = items or []

    async def list_by_user(self, user_id):
        return self._items


class _FakeProvider:
    def __init__(self, response: str) -> None:
        self.response = response
        self.received = None

    async def analyze_symptoms(self, symptoms, meds):
        self.received = {"symptoms": symptoms, "meds": meds}
        return self.response


def _symptom(user_id) -> Symptom:
    from datetime import UTC, datetime
    return Symptom(
        id=uuid.uuid4(), user_id=user_id, description="mareo", severity="leve",
        occurred_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC),
    )


def _med(user_id) -> Medication:
    return Medication(
        id=uuid.uuid4(), user_id=user_id, name="Ibuprofeno", dose="400 mg", duration_days=1
    )


async def test_analyze_saves_assistant_message_scoped_to_user():
    user_id = uuid.uuid4()
    ai_repo = _FakeAiRepo()
    sym_repo = _FakeSymptomRepo([_symptom(user_id)])
    provider = _FakeProvider(f"Analisis. {DISCLAIMER}")
    service = AiService(provider, ai_repo, sym_repo, _FakeMedRepo([_med(user_id)]))

    message = await service.analyze_symptoms(user_id)

    assert message.user_id == user_id
    assert message.kind == "symptom_analysis"
    assert message.role == "assistant"
    assert len(ai_repo.store) == 1
    assert sym_repo.calls == [user_id]  # cargo los sintomas del user
    # el provider recibio los dicts de sintomas y meds
    assert provider.received["symptoms"][0]["description"] == "mareo"
    assert provider.received["meds"][0]["name"] == "Ibuprofeno"


async def test_analyze_appends_disclaimer_when_missing():
    user_id = uuid.uuid4()
    ai_repo = _FakeAiRepo()
    provider = _FakeProvider("Analisis sin aviso legal")  # sin disclaimer
    service = AiService(provider, ai_repo, _FakeSymptomRepo(), _FakeMedRepo())

    message = await service.analyze_symptoms(user_id)

    assert DISCLAIMER in message.content


async def test_analyze_does_not_duplicate_disclaimer():
    user_id = uuid.uuid4()
    ai_repo = _FakeAiRepo()
    provider = _FakeProvider(f"Analisis. {DISCLAIMER}")  # ya lo trae
    service = AiService(provider, ai_repo, _FakeSymptomRepo(), _FakeMedRepo())

    message = await service.analyze_symptoms(user_id)

    assert message.content.count(DISCLAIMER) == 1


async def test_extract_medications_from_image_uses_ocr_text(monkeypatch):
    user_id = uuid.uuid4()
    img = Image.new("RGB", (200, 80), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Amoxicilina 500 mg\nParacetamol 650 mg", fill="black")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    monkeypatch.setitem(
        __import__("sys").modules,
        "pytesseract",
        SimpleNamespace(
            image_to_string=lambda image: "Amoxicilina 500 mg\nParacetamol 650 mg"
        ),
    )
    service = AiService(None, _FakeAiRepo(), _FakeSymptomRepo(), _FakeMedRepo())

    extracted = await service.extract_medications_from_image(user_id, "recipe.png", buffer.getvalue())

    assert extracted[0]["dose"] == "500 mg"
    assert extracted[1]["dose"] in {"650 mg", "850 mg"}
    assert extracted[0]["name"] or extracted[1]["name"]
