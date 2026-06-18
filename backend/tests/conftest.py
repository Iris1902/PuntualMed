import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="session", autouse=True)
def _test_env():
    # Entorno minimo para poder instanciar la app en tests
    os.environ.setdefault(
        "DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test"
    )


@pytest.fixture
def app(_test_env):
    # App fresca por test; limpia el cache de settings
    from app.core.config import get_settings

    get_settings.cache_clear()
    from app.main import create_app

    return create_app()


@pytest_asyncio.fixture
async def client(app):
    # Cliente HTTP asincrono contra la app en memoria (sin servidor real)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
