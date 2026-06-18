"""baseline

Revision ID: 2b24089e61b0
Revises: 
Create Date: 2026-06-18 00:26:12.592846

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2b24089e61b0'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
