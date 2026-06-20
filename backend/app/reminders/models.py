import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IntakeLog(Base):
    # Una toma programada de un medicamento, dentro de la duracion del tratamiento.
    # status: pending -> taken (confirmada) | missed (vencida, lo marca el worker futuro).
    __tablename__ = "intake_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    medication_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("medications.id", ondelete="CASCADE")
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String, default="pending")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    photo_url: Mapped[str | None] = mapped_column(String)
    # Reservado para la alerta familiar del worker diferido (idempotencia).
    alert_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
