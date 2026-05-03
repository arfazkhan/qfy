"""add_entity_type_to_user

Revision ID: 063e5c1995b1
Revises: 02297df155d3
Create Date: 2026-05-04 03:46:46.539362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '063e5c1995b1'
down_revision: Union[str, Sequence[str], None] = '02297df155d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('entity_type', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_entity_type'), 'users', ['entity_type'], unique=False)
    
    # Backfill existing data based on ID length
    # QID (11 digits) = individual, CR (8 digits) = business
    op.execute("UPDATE users SET entity_type = 'business' WHERE length(qid_number) = 8")
    op.execute("UPDATE users SET entity_type = 'individual' WHERE length(qid_number) != 8 OR entity_type IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_entity_type'), table_name='users')
    op.drop_column('users', 'entity_type')
