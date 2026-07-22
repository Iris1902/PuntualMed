import uuid
from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

from app.meds.models import Medication, MedicationSchedule
from app.reminders.models import IntakeLog
from app.reminders.service import IntakeService

_TZ = ZoneInfo("America/Guayaquil")


class _FakeRepo:
    def __init__(self) -> None:
        self.store: dict[uuid.UUID, IntakeLog] = {}
        self.last_call: dict = {}

    async def add(self, intake):
        self.store[intake.id] = intake
        return intake

    async def add_many(self, intakes):
        for i in intakes:
            self.store[i.id] = i
        return intakes

    async def get_for_user(self, intake_id, user_id):
        i = self.store.get(intake_id)
        return i if i and i.user_id == user_id else None

    async def list_for_user(self, user_id, lower, upper, status):
        self.last_call = {"lower": lower, "upper": upper, "status": status}
        items = [i for i in self.store.values() if i.user_id == user_id]
        if status is not None:
            items = [i for i in items if i.status == status]
        return sorted(items, key=lambda i: i.scheduled_at)

    async def delete_pending_from(self, medication_id, from_dt):
        doomed = [
            i
            for i in self.store.values()
            if i.medication_id == medication_id
            and i.status == "pending"
            and i.scheduled_at >= from_dt
        ]
        for i in doomed:
            del self.store[i.id]
        return len(doomed)


def _med(user_id, days=7, times=(time(8, 0), time(20, 0))) -> Medication:
    return Medication(
        id=uuid.uuid4(), user_id=user_id, name="Paracetamol", dose="500 mg",
        frequency_hours=8, start_date=date(2026, 6, 19), duration_days=days,
        end_date=date(2026, 6, 19 + days), notes=None,
        schedules=[MedicationSchedule(id=uuid.uuid4(), time_of_day=t) for t in times],
    )


async def test_generate_creates_one_intake_per_day_per_schedule():
    user_id = uuid.uuid4()
    repo = _FakeRepo()
    service = IntakeService(repo)
    intakes = await service.generate_for_medication(_med(user_id, days=7))
    # 7 dias x 2 horarios = 14 tomas
    assert len(intakes) == 14
    assert all(i.status == "pending" for i in intakes)
    assert all(i.user_id == user_id for i in intakes)


async def test_generate_uses_app_timezone():
    repo = _FakeRepo()
    service = IntakeService(repo)
    intakes = await service.generate_for_medication(_med(uuid.uuid4(), days=1, times=(time(8, 0),)))
    assert len(intakes) == 1
    expected = datetime.combine(date(2026, 6, 19), time(8, 0), tzinfo=_TZ)
    # mismo instante absoluto (08:00 en UTC-5 == 13:00 UTC)
    assert intakes[0].scheduled_at == expected
    # America/Guayaquil no observa DST, por lo que el offset UTC-5 es fijo
    assert intakes[0].scheduled_at.astimezone(UTC).hour == 13


async def test_generate_from_date_skips_past_days():
    user_id = uuid.uuid4()
    repo = _FakeRepo()
    service = IntakeService(repo)
    med = _med(user_id, days=5, times=(time(8, 0),))  # 2026-06-19 .. 2026-06-23
    intakes = await service.generate_for_medication(med, from_date=date(2026, 6, 21))
    # Solo desde el 21 en adelante: 21, 22, 23 = 3 tomas (no 5)
    assert len(intakes) == 3
    assert min(i.scheduled_at.date() for i in intakes) == date(2026, 6, 21)


async def test_regenerate_pending_from_today_keeps_history_and_replaces_future():
    user_id = uuid.uuid4()
    repo = _FakeRepo()
    med = _med(user_id, days=5, times=(time(8, 0),))  # 2026-06-19 .. 2026-06-23

    # Historial: una toma pasada ya confirmada y una pasada que quedo pendiente
    # (ninguna debe tocarse), mas una pendiente futura con el horario viejo
    # (esa si debe desaparecer al regenerar).
    taken = IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=med.id,
        scheduled_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC), status="taken",
    )
    old_pending_past = IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=med.id,
        scheduled_at=datetime(2026, 6, 20, 13, 0, tzinfo=UTC), status="pending",
    )
    old_pending_future = IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=med.id,
        scheduled_at=datetime(2026, 6, 22, 13, 0, tzinfo=UTC), status="pending",
    )
    for i in (taken, old_pending_past, old_pending_future):
        repo.store[i.id] = i

    service = IntakeService(repo)
    now = datetime(2026, 6, 21, 12, 0, tzinfo=_TZ)  # "hoy" es el 21 a mediodia
    # El medicamento ahora tiene un horario nuevo (9:00 en vez de 8:00)
    med.schedules = [MedicationSchedule(id=uuid.uuid4(), time_of_day=time(9, 0))]

    await service.regenerate_pending_from_today(med, now=now)

    remaining = list(repo.store.values())
    # El historial (taken y pending del pasado) sigue intacto
    assert taken.id in repo.store
    assert old_pending_past.id in repo.store
    # La pendiente futura vieja fue reemplazada
    assert old_pending_future.id not in repo.store
    # Se generaron tomas nuevas desde hoy (21) hasta el fin (23) con el horario 9:00
    new_ones = [i for i in remaining if i.id not in (taken.id, old_pending_past.id)]
    assert len(new_ones) == 3  # 21, 22, 23
    # 9:00 en America/Guayaquil (UTC-5, sin DST) equivale a las 14:00 UTC
    assert all(i.scheduled_at.astimezone(UTC).hour == 14 for i in new_ones)


async def test_confirm_sets_taken_and_photo():
    user_id = uuid.uuid4()
    repo = _FakeRepo()
    intake = IntakeLog(
        id=uuid.uuid4(), user_id=user_id, medication_id=uuid.uuid4(),
        scheduled_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC), status="pending",
    )
    repo.store[intake.id] = intake
    service = IntakeService(repo)
    result = await service.confirm(user_id, intake.id, "https://x/p.jpg")
    assert result.status == "taken"
    assert result.confirmed_at is not None
    assert result.photo_url == "https://x/p.jpg"


async def test_confirm_other_user_returns_none():
    owner, other = uuid.uuid4(), uuid.uuid4()
    repo = _FakeRepo()
    intake = IntakeLog(
        id=uuid.uuid4(), user_id=owner, medication_id=uuid.uuid4(),
        scheduled_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC), status="pending",
    )
    repo.store[intake.id] = intake
    service = IntakeService(repo)
    assert await service.confirm(other, intake.id, None) is None


async def test_list_for_user_passes_inclusive_tz_bounds():
    # Verifica que el servicio convierte las fechas a limites tz-aware correctos
    user_id = uuid.uuid4()
    repo = _FakeRepo()
    service = IntakeService(repo)

    # Caso con rango de fechas: to_date es inclusivo, upper apunta al dia siguiente
    await service.list_for_user(
        user_id, from_date=date(2026, 6, 19), to_date=date(2026, 6, 20), status=None
    )
    tz = ZoneInfo("America/Guayaquil")
    assert repo.last_call["lower"] == datetime.combine(date(2026, 6, 19), time(0, 0), tzinfo=tz)
    assert repo.last_call["upper"] == datetime.combine(date(2026, 6, 21), time(0, 0), tzinfo=tz)

    # Caso sin filtro de fechas: lower y upper deben ser None
    await service.list_for_user(user_id, from_date=None, to_date=None, status=None)
    assert repo.last_call["lower"] is None
    assert repo.last_call["upper"] is None
