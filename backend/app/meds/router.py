import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.meds.repository import MedicationRepository
from app.meds.schemas import (
    MedicationCreate,
    MedicationRead,
    MedicationUpdate,
    ScheduleCreate,
    ScheduleRead,
)
from app.meds.service import MedicationService
from app.reminders.router import get_intake_service
from app.reminders.service import IntakeService

router = APIRouter(prefix="/medications", tags=["medications"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="medication not found"
)


def get_medication_service(db: AsyncSession = Depends(get_db)) -> MedicationService:
    return MedicationService(MedicationRepository(db))


@router.post("", response_model=MedicationRead, status_code=status.HTTP_201_CREATED)
async def create_medication(
    data: MedicationCreate,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
    intake_service: IntakeService = Depends(get_intake_service),
) -> MedicationRead:
    medication = await service.create(current.id, data)
    # Genera las tomas del tratamiento en la misma sesion/transaccion
    await intake_service.generate_for_medication(medication)
    return MedicationRead.model_validate(medication)


@router.get("", response_model=list[MedicationRead])
async def list_medications(
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> list[MedicationRead]:
    meds = await service.list_for_user(current.id)
    return [MedicationRead.model_validate(m) for m in meds]


@router.get("/{medication_id}", response_model=MedicationRead)
async def get_medication(
    medication_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> MedicationRead:
    medication = await service.get_for_user(current.id, medication_id)
    if medication is None:
        raise _NOT_FOUND
    return MedicationRead.model_validate(medication)


@router.patch("/{medication_id}", response_model=MedicationRead)
async def update_medication(
    medication_id: uuid.UUID,
    data: MedicationUpdate,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> MedicationRead:
    medication = await service.update(current.id, medication_id, data)
    if medication is None:
        raise _NOT_FOUND
    return MedicationRead.model_validate(medication)


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> None:
    deleted = await service.delete(current.id, medication_id)
    if not deleted:
        raise _NOT_FOUND


@router.post(
    "/{medication_id}/schedules",
    response_model=ScheduleRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_schedule(
    medication_id: uuid.UUID,
    data: ScheduleCreate,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> ScheduleRead:
    schedule = await service.add_schedule(current.id, medication_id, data)
    if schedule is None:
        raise _NOT_FOUND
    return ScheduleRead.model_validate(schedule)


@router.get("/{medication_id}/schedules", response_model=list[ScheduleRead])
async def list_schedules(
    medication_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    service: MedicationService = Depends(get_medication_service),
) -> list[ScheduleRead]:
    medication = await service.get_for_user(current.id, medication_id)
    if medication is None:
        raise _NOT_FOUND
    return [ScheduleRead.model_validate(s) for s in medication.schedules]
