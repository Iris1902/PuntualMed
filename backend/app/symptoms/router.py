import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.meds.repository import MedicationRepository
from app.symptoms.repository import SymptomRepository
from app.symptoms.schemas import SymptomCreate, SymptomRead, SymptomUpdate
from app.symptoms.service import SymptomService

router = APIRouter(prefix="/symptoms", tags=["symptoms"])

_MED_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="medication not found"
)


def get_symptom_service(db: AsyncSession = Depends(get_db)) -> SymptomService:
    return SymptomService(SymptomRepository(db), MedicationRepository(db))


@router.post("", response_model=SymptomRead, status_code=status.HTTP_201_CREATED)
async def create_symptom(
    data: SymptomCreate,
    current: CurrentUser = Depends(get_current_user),
    service: SymptomService = Depends(get_symptom_service),
) -> SymptomRead:
    symptom = await service.create(current.id, data)
    if symptom is None:
        raise _MED_NOT_FOUND
    return SymptomRead.model_validate(symptom)


@router.get("", response_model=list[SymptomRead])
async def list_symptoms(
    current: CurrentUser = Depends(get_current_user),
    service: SymptomService = Depends(get_symptom_service),
) -> list[SymptomRead]:
    symptoms = await service.list_for_user(current.id)
    return [SymptomRead.model_validate(s) for s in symptoms]


@router.patch("/{symptom_id}", response_model=SymptomRead)
async def update_symptom(
    symptom_id: uuid.UUID,
    data: SymptomUpdate,
    current: CurrentUser = Depends(get_current_user),
    service: SymptomService = Depends(get_symptom_service),
) -> SymptomRead:
    symptom = await service.update(current.id, symptom_id, data)
    if symptom is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="symptom not found"
        )
    return SymptomRead.model_validate(symptom)


@router.delete("/{symptom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_symptom(
    symptom_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    service: SymptomService = Depends(get_symptom_service),
) -> None:
    if not await service.delete(current.id, symptom_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="symptom not found"
        )
