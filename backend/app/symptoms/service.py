import uuid
from datetime import UTC, datetime

from app.meds.repository import MedicationRepository
from app.symptoms.models import Symptom
from app.symptoms.repository import SymptomRepository
from app.symptoms.schemas import SymptomCreate


class SymptomService:
    # Logica de sintomas; la autorizacion se aplica filtrando por user_id.
    # Valida la pertenencia del medicamento opcional reusando MedicationRepository.
    def __init__(
        self,
        repository: SymptomRepository,
        medication_repository: MedicationRepository,
    ) -> None:
        self._repository = repository
        self._medication_repository = medication_repository

    async def create(
        self, user_id: uuid.UUID, data: SymptomCreate
    ) -> Symptom | None:
        if data.medication_id is not None:
            medication = await self._medication_repository.get_for_user(
                data.medication_id, user_id
            )
            if medication is None:
                return None
        symptom = Symptom(
            id=uuid.uuid4(),
            user_id=user_id,
            medication_id=data.medication_id,
            description=data.description,
            severity=data.severity.value if data.severity is not None else None,
            occurred_at=data.occurred_at or datetime.now(UTC),
        )
        return await self._repository.add(symptom)

    async def list_for_user(self, user_id: uuid.UUID) -> list[Symptom]:
        return await self._repository.list_by_user(user_id)
