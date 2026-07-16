import uuid
import os # <-- Nuevo: importamos os para leer el .env directamente
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

# 1. Añadimos DeepSeekProvider a tus importaciones
from app.ai.provider import AIProvider, GeminiProvider, GLMProvider, DeepSeekProvider
from app.ai.repository import AiMessageRepository
from app.ai.schemas import AiMessageRead
from app.ai.service import AiService
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.meds.repository import MedicationRepository
from app.symptoms.repository import SymptomRepository

load_dotenv()

router = APIRouter(prefix="/ai", tags=["ai"])

class AnalyzeRequest(BaseModel):
    symptom_id: uuid.UUID | None = None

_DEFAULT_ANALYZE_REQUEST = AnalyzeRequest()

# 2. Modificamos la fábrica para que priorice DeepSeek
#def get_ai_provider() -> AIProvider:
#    settings = get_settings()
    
    # Intentamos leer la clave de DeepSeek del .env
#    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
#    print(f"\n🔑 CLAVE DE DEEPSEEK ENCONTRADA: {deepseek_key}\n")
#    if deepseek_key:
#        return DeepSeekProvider(deepseek_key)
        
    # Si por alguna razón no está el token de DeepSeek, 
#    if settings.gemini_api_key:
#        return GeminiProvider(settings.gemini_api_key)
#    return GLMProvider(settings.zhipu_api_key)


def get_ai_provider() -> AIProvider:
    settings = get_settings()
    
    # Volvemos a la lógica original: si hay clave de Gemini, la usamos.
    if settings.gemini_api_key:
        # Añadimos este print temporal solo para asegurar que SÍ está leyendo tu clave
        print(f"\n🔑 CLAVE DE GEMINI ENCONTRADA: {settings.gemini_api_key[:10]}...\n") 
        return GeminiProvider(settings.gemini_api_key)
        
    return GLMProvider(settings.zhipu_api_key)

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