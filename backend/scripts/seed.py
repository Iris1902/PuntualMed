import asyncio
import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import delete, select

from app.core.database import get_session_factory
from app.meds.models import Medication
from app.meds.repository import MedicationRepository
from app.meds.schemas import MedicationCreate, ScheduleCreate
from app.meds.service import MedicationService
from app.reminders.models import IntakeLog
from app.reminders.repository import IntakeRepository
from app.reminders.service import IntakeService
from app.symptoms.models import Symptom
from app.users.models import Profile

USER_ID = uuid.UUID("09539ae9-0363-4457-9596-665af7467e6e")


async def _reset(session) -> None:
    # Borra los datos previos del usuario de prueba para que el seed sea re-ejecutable.
    await session.execute(delete(IntakeLog).where(IntakeLog.user_id == USER_ID))
    await session.execute(delete(Symptom).where(Symptom.user_id == USER_ID))
    await session.execute(delete(Medication).where(Medication.user_id == USER_ID))
    await session.commit()


async def _ensure_profile(session) -> None:
    profile = await session.get(Profile, USER_ID)
    if profile is None:
        session.add(Profile(id=USER_ID, full_name="Jahir"))
    else:
        profile.full_name = "Jahir"
    await session.commit()


async def _seed() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await _reset(session)
        await _ensure_profile(session)

        meds_service = MedicationService(MedicationRepository(session))
        intakes_service = IntakeService(IntakeRepository(session))
        start = date.today() - timedelta(days=7)

        specs = [
            ("Losartan", "50 mg", 8, [time(9, 0)]),
            ("Metformina", "500 mg", 8, [time(8, 0), time(20, 0)]),
        ]
        for name, dose, freq, times in specs:
            med = await meds_service.create(
                USER_ID,
                MedicationCreate(
                    name=name,
                    dose=dose,
                    start_date=start,
                    duration_days=30,
                    frequency_hours=freq,
                    schedules=[ScheduleCreate(time_of_day=t) for t in times],
                ),
            )
            await intakes_service.generate_for_medication(med)

        # Marca como tomadas las intakes ya vencidas mas antiguas (deja el resto pendiente).
        rows = (
            await session.execute(
                select(IntakeLog)
                .where(IntakeLog.user_id == USER_ID, IntakeLog.scheduled_at < datetime.now(UTC))
                .order_by(IntakeLog.scheduled_at)
            )
        ).scalars().all()
        for intake in rows[: max(0, len(rows) - 3)]:
            intake.status = "taken"
            intake.confirmed_at = intake.scheduled_at

        first_med = (
            await session.execute(select(Medication).where(Medication.user_id == USER_ID))
        ).scalars().first()
        session.add_all(
            [
                Symptom(
                    id=uuid.uuid4(),
                    user_id=USER_ID,
                    medication_id=first_med.id,
                    description="Nauseas leves por la manana",
                    severity="leve",
                    occurred_at=datetime.now(UTC) - timedelta(days=2),
                ),
                Symptom(
                    id=uuid.uuid4(),
                    user_id=USER_ID,
                    medication_id=first_med.id,
                    description="Mareo al levantarme",
                    severity="moderado",
                    occurred_at=datetime.now(UTC) - timedelta(days=1),
                ),
                Symptom(
                    id=uuid.uuid4(),
                    user_id=USER_ID,
                    medication_id=None,
                    description="Dolor de cabeza",
                    severity="leve",
                    occurred_at=datetime.now(UTC),
                ),
            ]
        )
        await session.commit()

        total = len(
            (
                await session.execute(
                    select(IntakeLog).where(IntakeLog.user_id == USER_ID)
                )
            )
            .scalars()
            .all()
        )
        print(f"Seed OK: 2 medicamentos, {total} tomas, 3 sintomas, perfil 'Jahir'.")


if __name__ == "__main__":
    asyncio.run(_seed())
