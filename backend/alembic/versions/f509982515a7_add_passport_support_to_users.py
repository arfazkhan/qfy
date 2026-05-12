"""Add passport support to users

Revision ID: f509982515a7
Revises: e7f4ae3648c8
Create Date: 2026-05-06 20:22:22.751067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f509982515a7'
down_revision: Union[str, Sequence[str], None] = 'e7f4ae3648c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use multiple batch_alter_table for SQLite stability
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('passport_number', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('id_type', sa.String(), nullable=True))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('qid_number',
               existing_type=sa.VARCHAR(),
               nullable=True)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_id_type'), ['id_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_passport_number'), ['passport_number'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_passport_number'))
        batch_op.drop_index(batch_op.f('ix_users_id_type'))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('qid_number',
               existing_type=sa.VARCHAR(),
               nullable=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('id_type')
        batch_op.drop_column('passport_number')
