"""add_role_to_operators

Revision ID: 518632bb268a
Revises: 6dbd34ac926b
Create Date: 2026-05-04 02:05:45.078695

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '518632bb268a'
down_revision: Union[str, Sequence[str], None] = '6dbd34ac926b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('operators', sa.Column('role', sa.String(), nullable=True, server_default='staff'))


def downgrade() -> None:
    """Downgrade schema."""
    pass
