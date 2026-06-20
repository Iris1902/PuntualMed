import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.reminders.repository import IntakeRepository
from app.reminders.schemas import IntakeConfirm, IntakeRead, IntakeStatus
from app.reminders.service import IntakeService

router = APIRouter(prefix="/intakes", tags=["intakes"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="intake not found"
)


def get_intake_service(db: AsyncSession = Depends(get_db)) -> IntakeService:
    return IntakeService(IntakeRepository(db))


@router.get("", response_model=list[IntakeRead])
async def list_intakes(
    from_date: date | None = None,
    to_date: date | None = None,
    # alias para exponer ?status= sin pisar el `status` de fastapi
    status_filter: IntakeStatus | None = Query(default=None, alias="status"),
    current: CurrentUser = Depends(get_current_user),
    service: IntakeService = Depends(get_intake_service),
) -> list[IntakeRead]:
    status_value = status_filter.value if status_filter is not None else None
    intakes = await service.list_for_user(current.id, from_date, to_date, status_value)
    return [IntakeRead.model_validate(i) for i in intakes]


@router.post("/{intake_id}/confirm", response_model=IntakeRead)
async def confirm_intake(
    intake_id: uuid.UUID,
    data: IntakeConfirm,
    current: CurrentUser = Depends(get_current_user),
    service: IntakeService = Depends(get_intake_service),
) -> IntakeRead:
    intake = await service.confirm(current.id, intake_id, data.photo_url)
    if intake is None:
        raise _NOT_FOUND
    return IntakeRead.model_validate(intake)
