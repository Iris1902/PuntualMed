"""create intake logs

Revision ID: 7e05baeb1b73
Revises: 4c5bc566f481
Create Date: 2026-06-19 21:42:08.918443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7e05baeb1b73'
down_revision: Union[str, None] = '4c5bc566f481'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "intake_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("medication_id", sa.Uuid(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("alert_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"]),
        sa.ForeignKeyConstraint(["medication_id"], ["medications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Cierra PostgREST/anon; el backend (rol postgres, BYPASSRLS) sigue accediendo.
    op.execute("ALTER TABLE public.intake_logs ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("intake_logs")
