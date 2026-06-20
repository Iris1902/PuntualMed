import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.symptoms.models import Symptom


class SymptomRepository:
    # Acceso a datos de symptoms. Una instancia por request.
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, symptom: Symptom) -> Symptom:
        self._session.add(symptom)
        await self._session.flush()
        return symptom

    async def list_by_user(self, user_id: uuid.UUID) -> list[Symptom]:
        result = await self._session.execute(
            select(Symptom)
            .where(Symptom.user_id == user_id)
            .order_by(Symptom.occurred_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_user(
        self, symptom_id: uuid.UUID, user_id: uuid.UUID
    ) -> Symptom | None:
        result = await self._session.execute(
            select(Symptom).where(
                Symptom.id == symptom_id, Symptom.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, symptom: Symptom) -> None:
        await self._session.delete(symptom)
        await self._session.flush()
