"""add_manager_and_business_details

Revision ID: 204ad80fb567
Revises: eeb90b1c822e
Create Date: 2026-05-04 16:05:41.883614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '204ad80fb567'
down_revision: Union[str, Sequence[str], None] = 'eeb90b1c822e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adding columns to businesses table
    op.add_column('businesses', sa.Column('nationality', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('businesses', sa.Column('mobile', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('business_type', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('business_nature', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('manager_id', sa.UUID(), nullable=True))
    
    # Create foreign key for manager_id
    with op.batch_alter_table('businesses') as batch_op:
        batch_op.create_foreign_key('fk_business_manager', 'users', ['manager_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('businesses') as batch_op:
        batch_op.drop_constraint('fk_business_manager', type_='foreignkey')
        batch_op.drop_column('manager_id')
        batch_op.drop_column('business_nature')
        batch_op.drop_column('business_type')
        batch_op.drop_column('mobile')
        batch_op.drop_column('address')
        batch_op.drop_column('nationality')
