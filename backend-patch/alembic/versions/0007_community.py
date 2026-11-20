"""Persist volunteer community posts, social actions, reports and notifications.

Revision ID: 0007_community
Revises: 0006_people_workspace
"""
from alembic import op

revision = "0007_community"
down_revision = "0006_people_workspace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE community_posts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            author_profile_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 3000),
            image_data bytea,
            image_type text CHECK (image_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
            status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
            moderated_by uuid REFERENCES users(id) ON DELETE SET NULL,
            moderation_note text NOT NULL DEFAULT '',
            moderated_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            CHECK ((image_data IS NULL AND image_type IS NULL) OR (image_data IS NOT NULL AND image_type IS NOT NULL))
        );
        CREATE INDEX community_posts_feed_idx ON community_posts(status, created_at DESC);
        CREATE INDEX community_posts_author_idx ON community_posts(author_profile_id, created_at DESC);

        CREATE TABLE community_post_likes (
            post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
            volunteer_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (post_id, volunteer_id)
        );
        CREATE INDEX community_post_likes_volunteer_idx ON community_post_likes(volunteer_id, created_at DESC);

        CREATE TABLE community_post_comments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
            author_profile_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX community_post_comments_post_idx ON community_post_comments(post_id, created_at);

        CREATE TABLE community_connections (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_low uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            profile_high uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            requested_by uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            recipient_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (profile_low, profile_high),
            CHECK (profile_low < profile_high),
            CHECK (requested_by <> recipient_id),
            CHECK ((requested_by = profile_low AND recipient_id = profile_high) OR (requested_by = profile_high AND recipient_id = profile_low))
        );
        CREATE INDEX community_connections_recipient_idx ON community_connections(recipient_id, status, created_at DESC);
        CREATE INDEX community_connections_requester_idx ON community_connections(requested_by, status, created_at DESC);

        CREATE TABLE community_post_reports (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
            reporter_profile_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
            status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
            resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
            resolution_note text NOT NULL DEFAULT '',
            created_at timestamptz NOT NULL DEFAULT now(),
            resolved_at timestamptz
        );
        CREATE UNIQUE INDEX community_post_reports_pending_idx
            ON community_post_reports(post_id, reporter_profile_id) WHERE status = 'pending';
        CREATE INDEX community_post_reports_queue_idx ON community_post_reports(status, created_at DESC);

        CREATE TABLE community_notifications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            recipient_profile_id uuid NOT NULL REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
            actor_profile_id uuid REFERENCES volunteer_profiles(id) ON DELETE SET NULL,
            kind text NOT NULL CHECK (kind IN ('like', 'comment', 'connection_request', 'connection_accepted')),
            title text NOT NULL,
            body text NOT NULL,
            post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
            connection_id uuid REFERENCES community_connections(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now(),
            read_at timestamptz
        );
        CREATE INDEX community_notifications_recipient_idx
            ON community_notifications(recipient_profile_id, created_at DESC);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS community_notifications;
        DROP TABLE IF EXISTS community_post_reports;
        DROP TABLE IF EXISTS community_connections;
        DROP TABLE IF EXISTS community_post_comments;
        DROP TABLE IF EXISTS community_post_likes;
        DROP TABLE IF EXISTS community_posts;
        """
    )
