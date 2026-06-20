import uuid

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

    @staticmethod
    def _ensure_disclaimer(content: str) -> str:
        # Fail-safe: el usuario SIEMPRE recibe el disclaimer
        if DISCLAIMER in content:
            return content
        return f"{content}\n\n{DISCLAIMER}"
