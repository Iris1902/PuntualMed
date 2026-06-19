import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    # Perfil de usuario. id = auth.users.id de Supabase (sin FK cross-schema)
    __tablename__ = "profiles"

    # nullabilidad inferida de Mapped[T | None]; tipo explicito para alinear con la migracion
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String)
    expo_push_token: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
