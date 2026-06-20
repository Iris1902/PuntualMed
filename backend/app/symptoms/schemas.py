import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class SeverityLevel(StrEnum):
    LEVE = "leve"
    MODERADO = "moderado"
    SEVERO = "severo"


class SymptomCreate(BaseModel):
    description: str
    severity: SeverityLevel | None = None
    medication_id: uuid.UUID | None = None
    occurred_at: datetime | None = None


class SymptomUpdate(BaseModel):
    description: str | None = None
    severity: SeverityLevel | None = None
    medication_id: uuid.UUID | None = None


class SymptomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medication_id: uuid.UUID | None
    description: str
    severity: str | None
    occurred_at: datetime
    created_at: datetime
