"""Add tenant-scoped idempotency and masking audit proof."""
from alembic import op
import sqlalchemy as sa

revision = "0003_tenant_idempotency"
down_revision = "0002_enforce_no_raw_storage"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("events", sa.Column("idempotency_key", sa.String(), nullable=True))
    op.create_unique_constraint("uq_event_tenant_idempotency", "events", ["tenant_id", "idempotency_key"])
    op.add_column("audit_logs", sa.Column("masking_applied", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade():
    op.drop_column("audit_logs", "masking_applied")
    op.drop_constraint("uq_event_tenant_idempotency", "events", type_="unique")
    op.drop_column("events", "idempotency_key")
