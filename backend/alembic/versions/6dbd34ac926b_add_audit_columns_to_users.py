"""add_audit_columns_to_users

Revision ID: 6dbd34ac926b
Revises: 9953e065f05b
Create Date: 2026-05-04 02:01:43.393854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6dbd34ac926b'
down_revision: Union[str, Sequence[str], None] = '9953e065f05b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_manual_edit', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('modified_fields', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    pass
