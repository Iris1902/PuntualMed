import os
import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.meds.models import Medication, MedicationSchedule
from app.reminders.models import IntakeLog
from app.reminders.repository import IntakeRepository
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


async def _seed_med(session, user_id: uuid.UUID) -> uuid.UUID:
    session.add(Profile(id=user_id, full_name="Iris"))
    med = Medication(
        id=uuid.uuid4(), user_id=user_id, name="Paracetamol", dose="500 mg",
        frequency_hours=8, start_date=datetime(2026, 6, 19).date(), duration_days=7,
        end_date=datetime(2026, 6, 26).date(), notes=None,
        schedules=[
            MedicationSchedule(
                id=uuid.uuid4(), time_of_day=datetime(2026, 1, 1, 8, 0).time()
            )
        ],
    )
    session.add(med)
    await session.flush()
    return med.id


def _intake(user_id, med_id, hour, status="pending") -> IntakeLog:
    return IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=med_id,
        scheduled_at=datetime(2026, 6, 19, hour, 0, tzinfo=UTC), status=status,
    )


async def test_add_many_and_list_filters_by_user(session):
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    med_a = await _seed_med(session, user_a)
    med_b = await _seed_med(session, user_b)
    repo = IntakeRepository(session)
    await repo.add_many([_intake(user_a, med_a, 8), _intake(user_a, med_a, 20)])
    await repo.add_many([_intake(user_b, med_b, 8)])
    await session.commit()

    got = await repo.list_for_user(user_a, None, None, None)
    assert len(got) == 2
    assert all(i.user_id == user_a for i in got)


async def test_list_filters_by_status(session):
    user_id = uuid.uuid4()
    med = await _seed_med(session, user_id)
    repo = IntakeRepository(session)
    await repo.add_many([_intake(user_id, med, 8, "pending"), _intake(user_id, med, 20, "taken")])
    await session.commit()

    taken = await repo.list_for_user(user_id, None, None, "taken")
    assert len(taken) == 1
    assert taken[0].status == "taken"


async def test_get_for_user_isolates_owner(session):
    owner, other = uuid.uuid4(), uuid.uuid4()
    med = await _seed_med(session, owner)
    repo = IntakeRepository(session)
    (intake,) = await repo.add_many([_intake(owner, med, 8)])
    await session.commit()

    assert await repo.get_for_user(intake.id, owner) is not None
    assert await repo.get_for_user(intake.id, other) is None
