"""Add image columns to users

Revision ID: 9953e065f05b
Revises: ac70c5314dd7
Create Date: 2026-05-04 01:45:01.579651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9953e065f05b'
down_revision: Union[str, Sequence[str], None] = 'ac70c5314dd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('front_image', sa.String(), nullable=True))
    op.add_column('users', sa.Column('back_image', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'back_image')
    op.drop_column('users', 'front_image')
