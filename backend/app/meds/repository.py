import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.meds.models import Medication


class MedicationRepository:
    # Acceso a datos de medications. Una instancia por request.
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, medication: Medication) -> Medication:
        self._session.add(medication)
        await self._session.flush()
        return medication

    async def list_by_user(self, user_id: uuid.UUID) -> list[Medication]:
        result = await self._session.execute(
            select(Medication)
            .where(Medication.user_id == user_id)
            .order_by(Medication.created_at)
        )
        return list(result.scalars().all())

    async def get_for_user(
        self, medication_id: uuid.UUID, user_id: uuid.UUID
    ) -> Medication | None:
        # El filtro por user_id es la frontera de autorizacion a nivel de datos
        result = await self._session.execute(
            select(Medication).where(
                Medication.id == medication_id, Medication.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, medication: Medication) -> None:
        await self._session.delete(medication)
        await self._session.flush()
