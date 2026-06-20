import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# DATABASE_URL para los tests. Produccion ya NO requiere el entorno al importar (engine lazy);
# esto solo cubre los tests que importan app.core.database directamente.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test"
)
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-with-at-least-32-bytes")

# Registra todos los modelos en Base.metadata para que las FK se resuelvan entre slices
from app.meds.models import Medication, MedicationSchedule  # noqa: F401
from app.reminders.models import IntakeLog  # noqa: F401
from app.users.models import Profile  # noqa: F401


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
