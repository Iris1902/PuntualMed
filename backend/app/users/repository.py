import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import Profile


class ProfileRepository:
    # Acceso a datos de profiles. Una instancia por request (recibe la sesion).
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: uuid.UUID) -> Profile | None:
        result = await self._session.execute(
            select(Profile).where(Profile.id == user_id)
        )
        return result.scalar_one_or_none()

    async def add(self, profile: Profile) -> Profile:
        # flush asigna defaults y valida sin cerrar la transaccion
        self._session.add(profile)
        await self._session.flush()
        return profile
