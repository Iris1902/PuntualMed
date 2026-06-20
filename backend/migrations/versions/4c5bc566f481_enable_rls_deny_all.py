"""enable rls deny all

Revision ID: 4c5bc566f481
Revises: cb03ecb253f6
Create Date: 2026-06-19 20:58:24.205729

"""
from typing import Sequence, Union

from alembic import op

revision: str = '4c5bc566f481'
down_revision: Union[str, None] = 'cb03ecb253f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tablas que quedan expuestas por la Data API (PostgREST) de Supabase.
# Activar RLS sin policies las cierra a anon/authenticated; el backend entra con
# el rol postgres (BYPASSRLS), por lo que la autorizacion sigue en la capa de app.
_TABLES = (
    "profiles",
    "medications",
    "medication_schedules",
    "alembic_version",
)


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
