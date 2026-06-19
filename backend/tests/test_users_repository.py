import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.users.models import Profile
from app.users.repository import ProfileRepository

_TEST_DB = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not _TEST_DB, reason="TEST_DATABASE_URL no configurada (test de integracion)"
)


@pytest_asyncio.fixture
async def session():
    # Crea el esquema en una DB Postgres real, lo limpia al final
    engine = create_async_engine(_TEST_DB)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def test_get_returns_none_when_absent(session):
    repo = ProfileRepository(session)
    assert await repo.get(uuid.uuid4()) is None


async def test_add_then_get_returns_profile(session):
    repo = ProfileRepository(session)
    user_id = uuid.uuid4()
    await repo.add(Profile(id=user_id, full_name="Iris"))
    await session.commit()
    found = await repo.get(user_id)
    assert found is not None
    assert found.full_name == "Iris"
