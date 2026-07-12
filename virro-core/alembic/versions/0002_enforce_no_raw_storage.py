"""Enforce no raw event storage in v0."""
from alembic import op
import sqlalchemy as sa

revision="0002_enforce_no_raw_storage"
down_revision="0001_safe_signal_schema"
branch_labels=None
depends_on=None

def upgrade():
    op.execute("UPDATE events SET raw_stored = false WHERE raw_stored IS NULL")
    op.alter_column("events","raw_stored",existing_type=sa.Boolean(),nullable=False,server_default=sa.false())
    op.create_check_constraint("ck_events_raw_stored_false","events","raw_stored = false")

def downgrade():
    op.drop_constraint("ck_events_raw_stored_false","events",type_="check")
    op.alter_column("events","raw_stored",existing_type=sa.Boolean(),nullable=True,server_default=None)
