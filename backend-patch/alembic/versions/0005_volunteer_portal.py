"""Volunteer portal: link applications/profiles to portal users and targets.

Revision ID: 0005_volunteer_portal
Revises: 0004_proposals_events
"""
from alembic import op

revision = "0005_volunteer_portal"
down_revision = "0004_proposals_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE volunteer_applications
            ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS target_kind text NOT NULL DEFAULT 'General'
                CHECK (target_kind IN ('General', 'Project', 'Event')),
            ADD COLUMN IF NOT EXISTS target_id uuid,
            ADD COLUMN IF NOT EXISTS target_label text NOT NULL DEFAULT '';
        CREATE INDEX IF NOT EXISTS volunteer_applications_user_idx ON volunteer_applications(user_id);
        ALTER TABLE volunteer_profiles
            ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS unavailable_days text[] NOT NULL DEFAULT '{}';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS volunteer_applications_user_idx;
        ALTER TABLE volunteer_applications
            DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS target_kind,
            DROP COLUMN IF EXISTS target_id, DROP COLUMN IF EXISTS target_label;
        ALTER TABLE volunteer_profiles DROP COLUMN IF EXISTS about, DROP COLUMN IF EXISTS unavailable_days;
        """
    )
