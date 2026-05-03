"""add_business_compliance_tables

Revision ID: 7e992c0f4a83
Revises: 063e5c1995b1
Create Date: 2026-05-04 04:02:34.973510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e992c0f4a83'
down_revision: Union[str, Sequence[str], None] = '063e5c1995b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('businesses',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('cr_number', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('cr_expiry', sa.Date(), nullable=False),
    sa.Column('owner_id', sa.UUID(), nullable=True),
    sa.Column('authorized_person_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('last_updated', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['authorized_person_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_businesses_cr_number'), 'businesses', ['cr_number'], unique=True)
    
    op.create_table('business_documents',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('document_type', sa.String(), nullable=False),
    sa.Column('file_url', sa.String(), nullable=True),
    sa.Column('expiry_date', sa.Date(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('business_notes',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('operator_id', sa.UUID(), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
    sa.ForeignKeyConstraint(['operator_id'], ['operators.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('business_notes')
    op.drop_table('business_documents')
    op.drop_index(op.f('ix_businesses_cr_number'), table_name='businesses')
    op.drop_table('businesses')
