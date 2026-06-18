import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Valor minimo necesario para importar modulos que llaman a get_settings()
# en tiempo de carga (ej. app.core.database). Se establece antes de la
# recoleccion de tests para que los imports de modulo no fallen.
# Debe definirse antes de importar la app: app.core.database construye el engine al importarse
# (durante la coleccion de pytest), antes de que corran los fixtures.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test"
)


@pytest.fixture
def app():
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
