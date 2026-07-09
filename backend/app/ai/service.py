import re
import unicodedata
import uuid
from io import BytesIO
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
        try:
            if self._provider is not None and hasattr(
                self._provider, "extract_medications_from_image"
            ):
                extracted = await self._provider.extract_medications_from_image(
                    filename, image_bytes
                )
                normalized = self._normalize_prescription_output(extracted)
                if normalized:
                    return normalized
        except Exception:
            pass

        try:
            from PIL import Image
            import pytesseract
        except ImportError:
            return []

        try:
            with Image.open(BytesIO(image_bytes)) as image:
                text = pytesseract.image_to_string(image).strip()
        except Exception:
            return []

        if not text:
            return []

        text = unicodedata.normalize("NFKC", text)
        text = text.replace("“", '"').replace("”", '"').replace("’", "'")
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        medications: list[dict[str, Any]] = []
        for raw_line in text.splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if not line:
                continue

            line = line.strip("'\"“”‘’.,:;()[]{}")
            match = re.search(
                r"(?P<name>.*?)(?P<dose>\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ml|tablet|tabletas|capsula|caps|gotas|spray))",
                line,
                re.IGNORECASE,
            )
            if match:
                name = match.group("name").strip(" -")
                dose = match.group("dose").strip()
                if name:
                    medications.append(
                        {
                            "name": name,
                            "dose": dose,
                            "notes": "Extraído de la receta",
                        }
                    )
                    continue

            medications.append(
                {
                    "name": line,
                    "dose": "",
                    "notes": "Extraído de la receta",
                }
            )
        return medications

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
