import os
import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.symptoms.models import Symptom
from app.symptoms.repository import SymptomRepository
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


async def _seed_profile(session, user_id: uuid.UUID) -> None:
    session.add(Profile(id=user_id, full_name="Iris"))
    await session.flush()


def _symptom(user_id, hour, description="Mareo") -> Symptom:
    return Symptom(
        id=uuid.uuid4(), user_id=user_id, description=description,
        occurred_at=datetime(2026, 6, 19, hour, 0, tzinfo=UTC),
    )


async def test_add_and_list_filters_by_user(session):
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    await _seed_profile(session, user_a)
    await _seed_profile(session, user_b)
    repo = SymptomRepository(session)
    await repo.add(_symptom(user_a, 10))
    await repo.add(_symptom(user_b, 11))
    await session.commit()

    got = await repo.list_by_user(user_a)
    assert len(got) == 1
    assert got[0].user_id == user_a


async def test_list_orders_by_occurred_at_desc(session):
    user_id = uuid.uuid4()
    await _seed_profile(session, user_id)
    repo = SymptomRepository(session)
    await repo.add(_symptom(user_id, 8, "temprano"))
    await repo.add(_symptom(user_id, 20, "tarde"))
    await session.commit()

    got = await repo.list_by_user(user_id)
    assert [s.description for s in got] == ["tarde", "temprano"]
