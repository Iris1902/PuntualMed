from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_settings = get_settings()

# pool_pre_ping evita usar conexiones muertas; expire_on_commit=False
# evita lazy-loads accidentales tras commit
engine = create_async_engine(
    _settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # Una sesion por request: commit si todo va bien, rollback ante error
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
