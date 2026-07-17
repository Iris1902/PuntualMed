import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field


class ScheduleCreate(BaseModel):
    time_of_day: time


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    time_of_day: time


class ScheduleRecalculate(BaseModel):
    new_start_time: time


class MedicationCreate(BaseModel):
    name: str
    dose: str
    start_date: date
    duration_days: int = Field(gt=0)
    frequency_hours: int | None = Field(default=None, gt=0)
    notes: str | None = None
    schedules: list[ScheduleCreate] = Field(default_factory=list)


class MedicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    dose: str
    frequency_hours: int | None
    start_date: date
    duration_days: int
    end_date: date
    notes: str | None
    source: str
    active: bool
    created_at: datetime
    schedules: list[ScheduleRead]


class MedicationUpdate(BaseModel):
    name: str | None = None
    dose: str | None = None
    frequency_hours: int | None = None
    notes: str | None = None
    active: bool | None = None


class PrescriptionMedication(BaseModel):
    name: str
    dose: str
    start_date: date | None = None
    duration_days: int | None = None
    frequency_hours: int | None = None
    schedules: list[ScheduleCreate] = Field(default_factory=list)
    notes: str | None = None