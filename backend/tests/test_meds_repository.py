import os
import uuid
from datetime import date, time

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.meds.models import Medication, MedicationSchedule
from app.meds.repository import MedicationRepository
from app.users.models import Profile

_TEST_DB = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not _TEST_DB, reason="TEST_DATABASE_URL no configurada (test de integracion)"
)


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(_TEST_DB)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


def _medication(user_id: uuid.UUID, name: str = "Paracetamol") -> Medication:
    return Medication(
        id=uuid.uuid4(),
        user_id=user_id,
        name=name,
        dose="500 mg",
        frequency_hours=8,
        start_date=date(2026, 1, 1),
        duration_days=7,
        end_date=date(2026, 1, 8),
        notes=None,
        schedules=[MedicationSchedule(id=uuid.uuid4(), time_of_day=time(8, 0))],
    )


async def _seed_profile(session, user_id: uuid.UUID) -> None:
    session.add(Profile(id=user_id, full_name="Iris"))
    await session.flush()


async def test_add_and_list_by_user(session):
    user_id = uuid.uuid4()
    await _seed_profile(session, user_id)
    repo = MedicationRepository(session)
    await repo.add(_medication(user_id))
    await session.commit()
    meds = await repo.list_by_user(user_id)
    assert len(meds) == 1
    assert meds[0].name == "Paracetamol"
    assert len(meds[0].schedules) == 1


async def test_get_for_user_isolates_by_owner(session):
    owner = uuid.uuid4()
    other = uuid.uuid4()
    await _seed_profile(session, owner)
    await _seed_profile(session, other)
    repo = MedicationRepository(session)
    med = _medication(owner)
    await repo.add(med)
    await session.commit()
    assert await repo.get_for_user(med.id, owner) is not None
    assert await repo.get_for_user(med.id, other) is None


async def test_delete_removes_medication(session):
    user_id = uuid.uuid4()
    await _seed_profile(session, user_id)
    repo = MedicationRepository(session)
    med = _medication(user_id)
    await repo.add(med)
    await session.commit()
    await repo.delete(med)
    await session.commit()
    assert await repo.list_by_user(user_id) == []
