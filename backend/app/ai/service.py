import uuid
from typing import Any

from app.ai.models import AiMessage
from app.ai.provider import DISCLAIMER, AIProvider
from app.ai.repository import AiMessageRepository
from app.meds.repository import MedicationRepository
from app.symptoms.repository import SymptomRepository


class AiService:
    # Agrega sintomas + medicamentos del usuario y los analiza con el AIProvider,
    # garantizando el disclaimer medico antes de guardar el resultado.
    def __init__(
        self,
        provider: AIProvider,
        ai_repository: AiMessageRepository,
        symptom_repository: SymptomRepository,
        medication_repository: MedicationRepository,
    ) -> None:
        self._provider = provider
        self._ai_repository = ai_repository
        self._symptom_repository = symptom_repository
        self._medication_repository = medication_repository

    async def analyze_symptoms(
        self, user_id: uuid.UUID, symptom_id: uuid.UUID | None = None
    ) -> AiMessage:
        if symptom_id is not None:
            one = await self._symptom_repository.get_for_user(symptom_id, user_id)
            symptoms = [one] if one is not None else []
        else:
            symptoms = await self._symptom_repository.list_by_user(user_id)
        medications = await self._medication_repository.list_by_user(user_id)
        
        symptom_dicts = [
            {
                "description": s.description,
                "severity": s.severity,
                "occurred_at": s.occurred_at.isoformat(),
            }
            for s in symptoms
        ]
        med_dicts = [{"name": m.name, "dose": m.dose} for m in medications]
        
        content = await self._provider.analyze_symptoms(symptom_dicts, med_dicts)
        content = self._ensure_disclaimer(content)
        
        message = AiMessage(
            id=uuid.uuid4(),
            user_id=user_id,
            kind="symptom_analysis",
            role="assistant",
            content=content,
        )
        return await self._ai_repository.add(message)

    async def extract_medications_from_image(
        self,
        user_id: uuid.UUID,
        filename: str,
        image_bytes: bytes,
    ) -> list[dict[str, Any]]:
        _ = user_id
        
        # Validamos que el proveedor exista y tenga la capacidad de extraer de imágenes
        if self._provider is None or not hasattr(self._provider, "extract_medications_from_image"):
            return []

        try:
            # Delegamos el trabajo de extracción al proveedor de IA
            extracted = await self._provider.extract_medications_from_image(
                filename, image_bytes
            )
            
            # Normalizamos la respuesta para garantizar que la estructura sea la esperada
            normalized = self._normalize_prescription_output(extracted)
            
            if normalized:
                return normalized
                
        except Exception as e:
            # Si el proveedor de IA falla (ej. error de red, token inválido),
            # devolvemos una lista vacía para que el frontend maneje el error
            # mostrando un mensaje al usuario.
            import httpx
            if isinstance(e, httpx.HTTPStatusError):
                print(f"\n❌ CHISME COMPLETO DE DEEPSEEK: {e.response.text}\n")
            else:
                print(f"\n❌ ERROR FATAL DE IA: {str(e)}\n")
            pass
        return []

    @staticmethod
    def _normalize_prescription_output(items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
        if not items:
            return []

        normalized: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            schedules = item.get("schedules") or []
            if isinstance(schedules, str):
                schedules = [schedules]
            elif not isinstance(schedules, list):
                schedules = []

            normalized.append(
                {
                    "name": str(item.get("name") or "").strip(),
                    "dose": str(item.get("dose") or "").strip(),
                    "start_date": item.get("start_date"),
                    "duration_days": item.get("duration_days"),
                    "frequency_hours": item.get("frequency_hours"),
                    "schedules": schedules,
                    "notes": item.get("notes"),
                }
            )
        return normalized

    @staticmethod
    def _ensure_disclaimer(content: str) -> str:
        # Fail-safe: el usuario SIEMPRE recibe el disclaimer
        if DISCLAIMER in content:
            return content
        return f"{content}\n\n{DISCLAIMER}"