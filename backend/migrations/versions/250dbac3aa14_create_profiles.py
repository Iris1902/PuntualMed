"""create profiles

Revision ID: 250dbac3aa14
Revises: 2b24089e61b0
Create Date: 2026-06-18 22:48:08.720389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '250dbac3aa14'
down_revision: Union[str, None] = '2b24089e61b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("expo_push_token", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("profiles")
