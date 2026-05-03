"""add_mobile_number_to_users

Revision ID: 02297df155d3
Revises: 518632bb268a
Create Date: 2026-05-04 02:19:51.620716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02297df155d3'
down_revision: Union[str, Sequence[str], None] = '518632bb268a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('mobile_number', sa.String(), nullable=True))
    op.create_index('ix_users_mobile_number', 'users', ['mobile_number'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    pass
