import uuid
from datetime import UTC, datetime

from app.meds.repository import MedicationRepository
from app.symptoms.models import Symptom
from app.symptoms.repository import SymptomRepository
from app.symptoms.schemas import SymptomCreate, SymptomUpdate


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

    async def update(
        self, user_id: uuid.UUID, symptom_id: uuid.UUID, data: SymptomUpdate
    ) -> Symptom | None:
        symptom = await self._repository.get_for_user(symptom_id, user_id)
        if symptom is None:
            return None
        if data.medication_id is not None:
            med = await self._medication_repository.get_for_user(
                data.medication_id, user_id
            )
            if med is None:
                return None
            symptom.medication_id = data.medication_id
        if data.description is not None:
            symptom.description = data.description
        if data.severity is not None:
            symptom.severity = data.severity.value
        return symptom

    async def delete(self, user_id: uuid.UUID, symptom_id: uuid.UUID) -> bool:
        symptom = await self._repository.get_for_user(symptom_id, user_id)
        if symptom is None:
            return False
        await self._repository.delete(symptom)
        return True
