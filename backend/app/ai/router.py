import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import AIProvider, GLMProvider
from app.ai.repository import AiMessageRepository
from app.ai.schemas import AiMessageRead
from app.ai.service import AiService
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.meds.repository import MedicationRepository
from app.symptoms.repository import SymptomRepository

router = APIRouter(prefix="/ai", tags=["ai"])


class AnalyzeRequest(BaseModel):
    symptom_id: uuid.UUID | None = None


# Valor por defecto a nivel de modulo para evitar B008 (llamada en default de argumento)
_DEFAULT_ANALYZE_REQUEST = AnalyzeRequest()


def get_ai_provider() -> AIProvider:
    return GLMProvider(get_settings().zhipu_api_key)


def get_ai_service(
    db: AsyncSession = Depends(get_db),
    provider: AIProvider = Depends(get_ai_provider),
) -> AiService:
    return AiService(
        provider,
        AiMessageRepository(db),
        SymptomRepository(db),
        MedicationRepository(db),
    )


@router.post("/symptoms/analyze", response_model=AiMessageRead)
async def analyze_symptoms(
    data: AnalyzeRequest = _DEFAULT_ANALYZE_REQUEST,
    current: CurrentUser = Depends(get_current_user),
    service: AiService = Depends(get_ai_service),
) -> AiMessageRead:
    message = await service.analyze_symptoms(current.id, data.symptom_id)
    return AiMessageRead.model_validate(message)
