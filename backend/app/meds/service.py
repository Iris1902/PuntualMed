import uuid
from datetime import timedelta, time

from app.meds.models import Medication, MedicationSchedule
from app.meds.repository import MedicationRepository
from app.meds.schemas import MedicationCreate, MedicationUpdate, ScheduleCreate


class MedicationService:
    def __init__(self, repository: MedicationRepository) -> None:
        self._repository = repository

    async def create(
        self, user_id: uuid.UUID, data: MedicationCreate
    ) -> Medication:
        # 1. Detección de inferencia (si la IA no mandó frecuencia)
        inferred_frequency = data.frequency_hours is None
        frequency = data.frequency_hours if not inferred_frequency else 24
        
        # 2. Construcción de notas con advertencia si es inferido
        notes = data.notes or ""
        if inferred_frequency:
            notes = (
                f"⚠️ NOTA: Horario inferido por IA. Por favor, valide la pauta de tratamiento con su médico. "
                f"{notes}"
            )

        # 3. Lógica de horarios
        if data.schedules and len(data.schedules) > 0:
            schedules_to_add = [
                MedicationSchedule(id=uuid.uuid4(), time_of_day=s.time_of_day)
                for s in data.schedules
            ]
        else:
            schedules_to_add = [
                MedicationSchedule(id=uuid.uuid4(), time_of_day=time(8, 0, 0))
            ]

        # 4. Construcción del objeto
        end_date = data.start_date + timedelta(days=data.duration_days)
        
        medication = Medication(
            id=uuid.uuid4(),
            user_id=user_id,
            name=data.name,
            dose=data.dose,
            frequency_hours=frequency,
            start_date=data.start_date,
            duration_days=data.duration_days,
            end_date=end_date,
            notes=notes,
            source="ai_inferred" if inferred_frequency else "manual",
            schedules=schedules_to_add,
        )
        return await self._repository.add(medication)

    async def list_for_user(self, user_id: uuid.UUID) -> list[Medication]:
        return await self._repository.list_by_user(user_id)

    async def get_for_user(
        self, user_id: uuid.UUID, medication_id: uuid.UUID
    ) -> Medication | None:
        return await self._repository.get_for_user(medication_id, user_id)

    async def update(
        self, user_id: uuid.UUID, medication_id: uuid.UUID, data: MedicationUpdate
    ) -> Medication | None:
        medication = await self._repository.get_for_user(medication_id, user_id)
        if medication is None:
            return None
        if data.name is not None:
            medication.name = data.name
        if data.dose is not None:
            medication.dose = data.dose
        if data.frequency_hours is not None:
            medication.frequency_hours = data.frequency_hours
        if data.notes is not None:
            medication.notes = data.notes
        if data.active is not None:
            medication.active = data.active
        return await self._repository.add(medication)

    async def delete(
        self, user_id: uuid.UUID, medication_id: uuid.UUID
    ) -> bool:
        medication = await self._repository.get_for_user(medication_id, user_id)
        if medication is None:
            return False
        await self._repository.delete(medication)
        return True

    async def add_schedule(
        self, user_id: uuid.UUID, medication_id: uuid.UUID, data: ScheduleCreate
    ) -> MedicationSchedule | None:
        medication = await self._repository.get_for_user(medication_id, user_id)
        if medication is None:
            return None
        schedule = MedicationSchedule(
            id=uuid.uuid4(),
            medication_id=medication.id,
            time_of_day=data.time_of_day,
        )
        medication.schedules.append(schedule)
        await self._repository.add(medication)
        return schedule

    async def recalculate_schedules(
        self, user_id: uuid.UUID, medication_id: uuid.UUID, new_start_time: time
    ) -> list[MedicationSchedule] | None:
        medication = await self._repository.get_for_user(medication_id, user_id)
        if medication is None:
            return None

        # Limpiamos horarios anteriores
        medication.schedules = []
        
        # Calculamos nuevos horarios basados en la frecuencia
        interval = medication.frequency_hours
        # Si la frecuencia es 0 o menor, evitamos bucles infinitos
        if interval <= 0:
            interval = 24

        # Calculamos cuántas tomas caben en un ciclo de 24h
        num_doses = 24 // interval
        
        new_schedules = []
        current_hour = new_start_time.hour
        current_minute = new_start_time.minute
        
        for i in range(num_doses):
            # Calculamos la hora sumando el intervalo
            total_minutes = (current_hour * 60 + current_minute + (i * interval * 60)) % 1440
            h = total_minutes // 60
            m = total_minutes % 60
            
            new_schedules.append(
                MedicationSchedule(
                    id=uuid.uuid4(),
                    medication_id=medication.id,
                    time_of_day=time(h, m)
                )
            )
            
        medication.schedules = new_schedules
        await self._repository.add(medication)
        return new_schedules