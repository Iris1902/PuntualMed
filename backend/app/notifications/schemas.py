import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LinkRead(BaseModel):
    deep_link: str
    expires_at: datetime


class ContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str | None
    created_at: datetime
