from datetime import datetime, timedelta

from app.reminders.repository import IntakeRepository


async def mark_missed_intakes(
    repo: IntakeRepository, now: datetime, grace_minutes: int
) -> int:
    # Devuelve cuantas tomas quedaron marcadas como vencidas.
    cutoff = now - timedelta(minutes=grace_minutes)
    return await repo.mark_missed_before(cutoff)
