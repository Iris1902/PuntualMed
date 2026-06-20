import uuid
from datetime import UTC, datetime

from app.meds.models import Medication
from app.symptoms.models import Symptom
from app.symptoms.schemas import SeverityLevel, SymptomCreate
from app.symptoms.service import SymptomService


class _FakeSymptomRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, Symptom] = {}

    async def add(self, symptom):
        self.store[symptom.id] = symptom
        return symptom

    async def list_by_user(self, user_id):
        items = [s for s in self.store.values() if s.user_id == user_id]
        return sorted(items, key=lambda s: s.occurred_at, reverse=True)


class _FakeMedRepo:
    def __init__(self, owned: dict | None = None) -> None:
        # owned: {(medication_id, user_id): Medication}
        self.owned = owned or {}

    async def get_for_user(self, medication_id, user_id):
        return self.owned.get((medication_id, user_id))


async def test_create_minimal_defaults_occurred_at_to_now():
    user_id = uuid.uuid4()
    repo = _FakeSymptomRepo()
    service = SymptomService(repo, _FakeMedRepo())
    symptom = await service.create(user_id, SymptomCreate(description="Nausea"))
    assert symptom is not None
    assert symptom.user_id == user_id
    assert symptom.description == "Nausea"
    assert symptom.severity is None
    assert symptom.medication_id is None
    assert symptom.occurred_at is not None
    assert symptom.occurred_at.tzinfo is not None


async def test_create_with_severity_and_explicit_occurred_at():
    user_id = uuid.uuid4()
    repo = _FakeSymptomRepo()
    service = SymptomService(repo, _FakeMedRepo())
    when = datetime(2026, 6, 18, 9, 0, tzinfo=UTC)
    symptom = await service.create(
        user_id,
        SymptomCreate(description="Dolor", severity=SeverityLevel.MODERADO, occurred_at=when),
    )
    assert symptom.severity == "moderado"
    assert symptom.occurred_at == when


async def test_create_with_owned_medication_links_it():
    user_id, med_id = uuid.uuid4(), uuid.uuid4()
    med = Medication(id=med_id, user_id=user_id, name="X", dose="1", duration_days=1)
    repo = _FakeSymptomRepo()
    service = SymptomService(repo, _FakeMedRepo({(med_id, user_id): med}))
    symptom = await service.create(
        user_id, SymptomCreate(description="Erupcion", medication_id=med_id)
    )
    assert symptom is not None
    assert symptom.medication_id == med_id


async def test_create_with_foreign_medication_returns_none():
    user_id, med_id = uuid.uuid4(), uuid.uuid4()
    repo = _FakeSymptomRepo()
    # el med no esta en owned -> no pertenece al user
    service = SymptomService(repo, _FakeMedRepo())
    result = await service.create(
        user_id, SymptomCreate(description="Erupcion", medication_id=med_id)
    )
    assert result is None
    assert repo.store == {}


async def test_list_for_user_delegates_desc():
    user_id = uuid.uuid4()
    repo = _FakeSymptomRepo()
    service = SymptomService(repo, _FakeMedRepo())
    await service.create(
        user_id, SymptomCreate(description="a", occurred_at=datetime(2026, 6, 1, tzinfo=UTC))
    )
    await service.create(
        user_id, SymptomCreate(description="b", occurred_at=datetime(2026, 6, 2, tzinfo=UTC))
    )
    got = await service.list_for_user(user_id)
    assert [s.description for s in got] == ["b", "a"]
