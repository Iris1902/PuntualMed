import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.reminders.models import IntakeLog


class IntakeRepository:
    # Acceso a datos de intake_logs. Una instancia por request.
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, intake: IntakeLog) -> IntakeLog:
        self._session.add(intake)
        await self._session.flush()
        return intake

    async def add_many(self, intakes: list[IntakeLog]) -> list[IntakeLog]:
        self._session.add_all(intakes)
        await self._session.flush()
        return intakes

    async def get_for_user(
        self, intake_id: uuid.UUID, user_id: uuid.UUID
    ) -> IntakeLog | None:
        # El filtro por user_id es la frontera de autorizacion a nivel de datos
        result = await self._session.execute(
            select(IntakeLog).where(
                IntakeLog.id == intake_id, IntakeLog.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        lower: datetime | None,
        upper: datetime | None,
        status: str | None,
    ) -> list[IntakeLog]:
        query = select(IntakeLog).where(IntakeLog.user_id == user_id)
        if lower is not None:
            query = query.where(IntakeLog.scheduled_at >= lower)
        if upper is not None:
            query = query.where(IntakeLog.scheduled_at < upper)
        if status is not None:
            query = query.where(IntakeLog.status == status)
        result = await self._session.execute(query.order_by(IntakeLog.scheduled_at))
        return list(result.scalars().all())

    async def mark_missed_before(self, cutoff: datetime) -> int:
        # Marca como vencidas las tomas pendientes cuya hora ya paso el margen de gracia.
        result = await self._session.execute(
            update(IntakeLog)
            .where(IntakeLog.status == "pending", IntakeLog.scheduled_at < cutoff)
            .values(status="missed")
            .execution_options(synchronize_session=False)
        )
        return result.rowcount or 0
