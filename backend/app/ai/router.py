import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import AIProvider, GeminiProvider
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

_DEFAULT_ANALYZE_REQUEST = AnalyzeRequest()


def get_ai_provider() -> AIProvider:
    settings = get_settings()
    
    # Validamos que la clave exista antes de instanciar Gemini
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=500, 
            detail="GEMINI_API_KEY no configurada en el servidor. Revisa tu archivo .env"
        )
        
    return GeminiProvider(settings.gemini_api_key)


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
    service: AiService = Depends(get_current_user), # Mantiene tu flujo original
) -> AiMessageRead:
    message = await service.analyze_symptoms(current.id, data.symptom_id)
    return AiMessageRead.model_validate(message)