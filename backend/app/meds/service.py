import uuid
from datetime import date, timedelta, time
from fastapi import HTTPException

from app.meds.models import Medication, MedicationSchedule
from app.meds.repository import MedicationRepository
from app.meds.schemas import MedicationCreate, MedicationUpdate, ScheduleCreate


class MedicationService:
    def __init__(self, repository: MedicationRepository) -> None:
        self._repository = repository

    async def validate_safety(
        self, user_id: uuid.UUID, medication_id: uuid.UUID | None, new_schedules: list[time]
    ) -> None:
        """
        Verifica si los nuevos horarios colisionan con algún medicamento activo.
        Si colisiona con un medicamento marcado 'AYUNAS', bloquea la operación.
        """
        active_meds = await self._repository.list_active_by_user(user_id)
        
        for med in active_meds:
            # Si estamos actualizando o recalculando un medicamento existente, ignoramos sus propios horarios antiguos
            if med.id == medication_id:
                continue
            
            for sch in med.schedules:
                if sch.time_of_day in new_schedules:
                    # Lógica de seguridad estricta para medicamentos en AYUNAS
                    if med.tags and "AYUNAS" in med.tags:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Conflicto de seguridad médica: El medicamento '{med.name}' requiere administrarse estrictamente en ayunas y de forma aislada a las {sch.time_of_day.strftime('%H:%M')}."
                        )


    async def create(
        self, user_id: uuid.UUID, data: MedicationCreate
    ) -> Medication:
        DIAS_GRACIA = 7
        fecha_limite = date.today() - timedelta(days=DIAS_GRACIA)

        if data.start_date < fecha_limite:
            raise HTTPException(
                status_code=400,
                detail=f"La fecha de inicio no puede ser anterior a {DIAS_GRACIA} días atrás."
            )

        # 2. Validación de duplicados exactos (mismo nombre y fecha de inicio activos)
        existing = await self._repository.find_active_by_name_and_date(user_id, data.name, data.start_date)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Ya tienes un tratamiento activo registrado para '{data.name}' que inicia en la fecha {data.start_date}."
            )

        # 3. Detección de inferencia (si la IA no mandó frecuencia)
        inferred_frequency = data.frequency_hours is None
        frequency = data.frequency_hours if not inferred_frequency else 24
        
        # 4. Construcción de notas con advertencia si es inferido
        notes = data.notes or ""
        if inferred_frequency:
            notes = (
                f"⚠️ NOTA: Horario inferido por IA. Por favor, valide la pauta de tratamiento con su médico. "
                f"{notes}"
            )

        # 5. Lógica de horarios
        if data.schedules and len(data.schedules) > 0:
            schedules_to_add = [
                MedicationSchedule(id=uuid.uuid4(), time_of_day=s.time_of_day)
                for s in data.schedules
            ]
        else:
            schedules_to_add = [
                MedicationSchedule(id=uuid.uuid4(), time_of_day=time(8, 0, 0))
            ]

        # 6. Ejecución del validador de seguridad clínica antes de persistir
        await self.validate_safety(user_id, None, [s.time_of_day for s in schedules_to_add])

        # 7. Construcción del objeto
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
            tags=data.tags,  # Almacenamos el array de etiquetas de seguridad
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
        if data.tags is not None:
            medication.tags = data.tags
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
        # Validar colisión de seguridad para la nueva hora individual que se quiere insertar
        await self.validate_safety(user_id, medication_id, [data.time_of_day])

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

        # 1. Simular la generación de los nuevos horarios para poder pasárselos al validador de seguridad
        interval = medication.frequency_hours
        if interval <= 0:
            interval = 24

        num_doses = 24 // interval
        simulated_times = []
        current_hour = new_start_time.hour
        current_minute = new_start_time.minute
        
        for i in range(num_doses):
            total_minutes = (current_hour * 60 + current_minute + (i * interval * 60)) % 1440
            h = total_minutes // 60
            m = total_minutes % 60
            simulated_times.append(time(h, m))

        # 2. Validar que la ráfaga de nuevos horarios recalculados no rompa reglas de AYUNAS con otros medicamentos
        await self.validate_safety(user_id, medication_id, simulated_times)

        # 3. Si pasa la validación, procedemos a limpiar y reescribir físicamente los horarios
        medication.schedules = []
        new_schedules = []
        
        for t in simulated_times:
            new_schedules.append(
                MedicationSchedule(
                    id=uuid.uuid4(),
                    medication_id=medication.id,
                    time_of_day=t
                )
            )
            
        medication.schedules = new_schedules
        await self._repository.add(medication)
        return new_schedules