"""Authenticated volunteer community API and administrator post moderation."""
import base64
import binascii
import json
import re
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession

router = APIRouter(prefix="/api/community", tags=["volunteer community"])
PORTAL_ROLES = {"Member", "Volunteer"}
ADMIN_ROLE = "Admin"
MAX_IMAGE_BYTES = 2_000_000
IMAGE_PATTERN = re.compile(r"^data:(image/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$")


def _require_portal_user(user) -> None:
    if user.role not in PORTAL_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The volunteer community is not available for this account.")


def _require_admin(user) -> None:
    if user.role != ADMIN_ROLE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access is required.")


def _my_profile(db, user):
    profile = db.execute(
        text("SELECT id, full_name, city, skills FROM volunteer_profiles WHERE user_id = :user_id"),
        {"user_id": user.id},
    ).mappings().first()
    if profile:
        return profile
    profile = db.execute(
        text("SELECT id, full_name, city, skills FROM volunteer_profiles WHERE user_id IS NULL AND lower(email) = lower(:email) ORDER BY created_at LIMIT 1"),
        {"email": user.email},
    ).mappings().first()
    if profile:
        db.execute(text("UPDATE volunteer_profiles SET user_id = :user_id WHERE id = :profile_id"), {"user_id": user.id, "profile_id": profile["id"]})
        db.commit()
        return db.execute(
            text("SELECT id, full_name, city, skills FROM volunteer_profiles WHERE id = :profile_id"),
            {"profile_id": profile["id"]},
        ).mappings().one()
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Your volunteer profile is not available yet.")


def _decode_image(image: str | None) -> tuple[bytes | None, str | None]:
    if image is None:
        return None, None
    match = IMAGE_PATTERN.fullmatch(image)
    if not match:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Use a JPEG, PNG, WebP, or GIF image.")
    try:
        content = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The selected image is invalid.") from error
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Choose an image under 2 MB.")
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": content.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
    }
    if not signatures[match.group(1)]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The image contents do not match the selected file type.")
    return content, match.group(1)


def _comment_data(comment: dict[str, Any]) -> dict[str, Any]:
    created_at = comment["created_at"]
    return {
        "id": str(comment["id"]),
        "authorId": str(comment["author_id"]),
        "authorName": comment["author_name"],
        "body": comment["body"],
        "createdAt": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
    }


def _post_query(where: str) -> str:
    return f"""
        SELECT p.id, p.author_profile_id, author.full_name AS author_name, author.city AS author_city,
               p.body, p.image_data, p.image_type, p.created_at,
               (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) AS likes_count,
               EXISTS (SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.volunteer_id = :viewer_id) AS liked_by_me,
               EXISTS (SELECT 1 FROM community_post_reports r WHERE r.post_id = p.id AND r.reporter_profile_id = :viewer_id AND r.status = 'pending') AS reported_by_me,
               COALESCE((
                   SELECT json_agg(json_build_object(
                       'id', recent.id, 'author_id', recent.author_profile_id, 'author_name', recent.author_name,
                       'body', recent.body, 'created_at', recent.created_at
                   ) ORDER BY recent.created_at)
                   FROM (
                       SELECT c.id, c.author_profile_id, commenter.full_name AS author_name, c.body, c.created_at
                       FROM community_post_comments c
                       JOIN volunteer_profiles commenter ON commenter.id = c.author_profile_id
                       WHERE c.post_id = p.id
                       ORDER BY c.created_at DESC
                       LIMIT 100
                   ) recent
               ), '[]'::json) AS comments
        FROM community_posts p
        JOIN volunteer_profiles author ON author.id = p.author_profile_id
        WHERE {where}
    """


def _serialize_post(row) -> dict[str, Any]:
    image = None
    if row["image_data"] is not None:
        image_bytes = bytes(row["image_data"])
        image = f"data:{row['image_type']};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    comments = row["comments"] or []
    if isinstance(comments, str):
        comments = json.loads(comments)
    return {
        "id": str(row["id"]),
        "authorId": str(row["author_profile_id"]),
        "name": row["author_name"],
        "place": row["author_city"] or "",
        "createdAt": row["created_at"].isoformat(),
        "text": row["body"],
        "image": image,
        "likesCount": int(row["likes_count"]),
        "likedByMe": bool(row["liked_by_me"]),
        "reportedByMe": bool(row["reported_by_me"]),
        "comments": [_comment_data(comment) for comment in comments],
    }


def _get_post(db, post_id: UUID, viewer_id: UUID | None, include_hidden: bool = False):
    visibility = "p.id = :post_id" if include_hidden else "p.id = :post_id AND p.status = 'published'"
    row = db.execute(
        text(_post_query(visibility)),
        {"post_id": post_id, "viewer_id": viewer_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    return _serialize_post(row)


class PostCreate(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    image: str | None = Field(default=None, max_length=2_700_000)


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ConnectionCreate(BaseModel):
    profile_id: UUID = Field(alias="profileId")
    model_config = {"populate_by_name": True}


class ConnectionDecision(BaseModel):
    action: Literal["accept", "decline"]


class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class ReportDecision(BaseModel):
    action: Literal["dismiss", "remove"]
    note: str = Field(default="", max_length=1000)


class NotificationReadUpdate(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=100)
    is_read: bool = Field(alias="isRead")
    model_config = {"populate_by_name": True}


@router.get("/posts")
def list_posts(
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    _require_portal_user(user)
    profile = _my_profile(db, user)
    rows = db.execute(
        text(_post_query("p.status = 'published'") + " ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset"),
        {"viewer_id": profile["id"], "limit": limit, "offset": offset},
    ).mappings()
    return {"items": [_serialize_post(row) for row in rows]}


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(body: PostCreate, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    profile = _my_profile(db, user)
    content = body.text.strip()
    if not content:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Write something before publishing.")
    image_data, image_type = _decode_image(body.image)
    row = db.execute(
        text(
            """INSERT INTO community_posts (author_profile_id, body, image_data, image_type)
               VALUES (:author_id, :body, :image_data, :image_type) RETURNING id"""
        ),
        {"author_id": profile["id"], "body": content, "image_data": image_data, "image_type": image_type},
    ).mappings().one()
    db.commit()
    return _get_post(db, row["id"], profile["id"])


@router.post("/posts/{post_id}/likes", status_code=status.HTTP_201_CREATED)
def like_post(post_id: UUID, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    profile = _my_profile(db, user)
    post = db.execute(
        text("SELECT id, author_profile_id FROM community_posts WHERE id = :id AND status = 'published'"),
        {"id": post_id},
    ).mappings().first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    inserted = db.execute(
        text(
            """INSERT INTO community_post_likes (post_id, volunteer_id)
               VALUES (:post_id, :profile_id)
               ON CONFLICT (post_id, volunteer_id) DO NOTHING
               RETURNING post_id"""
        ),
        {"post_id": post_id, "profile_id": profile["id"]},
    ).first()
    if inserted and post["author_profile_id"] != profile["id"]:
        db.execute(
            text(
                """INSERT INTO community_notifications (recipient_profile_id, actor_profile_id, kind, title, body, post_id)
                   VALUES (:recipient, :actor, 'like', 'Someone liked your post', :body, :post_id)"""
            ),
            {"recipient": post["author_profile_id"], "actor": profile["id"], "body": f"{profile['full_name']} liked your post.", "post_id": post_id},
        )
    db.commit()
    return {"liked": True}


@router.delete("/posts/{post_id}/likes", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(post_id: UUID, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    profile = _my_profile(db, user)
    db.execute(
        text("DELETE FROM community_post_likes WHERE post_id = :post_id AND volunteer_id = :profile_id"),
        {"post_id": post_id, "profile_id": profile["id"]},
    )
    db.commit()


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def comment_post(post_id: UUID, body: CommentCreate, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    profile = _my_profile(db, user)
    post = db.execute(
        text("SELECT id, author_profile_id FROM community_posts WHERE id = :id AND status = 'published'"),
        {"id": post_id},
    ).mappings().first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    content = body.text.strip()
    if not content:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Write a comment before posting.")
    row = db.execute(
        text(
            """INSERT INTO community_post_comments (post_id, author_profile_id, body)
               VALUES (:post_id, :author_id, :body) RETURNING id, created_at"""
        ),
        {"post_id": post_id, "author_id": profile["id"], "body": content},
    ).mappings().one()
    if post["author_profile_id"] != profile["id"]:
        db.execute(
            text(
                """INSERT INTO community_notifications (recipient_profile_id, actor_profile_id, kind, title, body, post_id)
                   VALUES (:recipient, :actor, 'comment', 'New comment on your post', :body, :post_id)"""
            ),
            {"recipient": post["author_profile_id"], "actor": profile["id"], "body": f"{profile['full_name']} commented on your post.", "post_id": post_id},
        )
    db.commit()
    return {
        "id": str(row["id"]),
        "authorId": str(profile["id"]),
        "authorName": profile["full_name"],
        "body": content,
        "createdAt": row["created_at"].isoformat(),
    }


@router.get("/people")
def list_people(user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    rows = db.execute(
        text(
            """SELECT p.id, p.full_name, p.city, p.skills,
                      (SELECT COUNT(*) FROM community_posts post
                       WHERE post.author_profile_id = p.id AND post.status = 'published') AS post_count
               FROM volunteer_profiles p
               WHERE p.status = 'Active' AND p.user_id IS NOT NULL AND p.id <> :profile_id
                 AND p.community_visible IS TRUE
                 AND lower(COALESCE(p.email, '')) NOT LIKE 'demo.%@example.org'
               ORDER BY p.full_name"""
        ),
        {"profile_id": mine["id"]},
    ).mappings().all()
    relationships = db.execute(
        text(
            """SELECT id, profile_low, profile_high, requested_by, recipient_id, status
               FROM community_connections
               WHERE profile_low = :profile_id OR profile_high = :profile_id"""
        ),
        {"profile_id": mine["id"]},
    ).mappings().all()
    by_person = {}
    for relation in relationships:
        person_id = relation["profile_high"] if relation["profile_low"] == mine["id"] else relation["profile_low"]
        status_value = relation["status"]
        if status_value == "pending":
            state = "pending_sent" if relation["requested_by"] == mine["id"] else "pending_received"
        elif status_value == "accepted":
            state = "connected"
        else:
            state = "none"
        by_person[str(person_id)] = {"status": state, "connectionId": str(relation["id"])}

    mutual_rows = db.execute(
        text(
            """WITH edges AS (
                   SELECT profile_low AS owner, profile_high AS other FROM community_connections WHERE status = 'accepted'
                   UNION ALL
                   SELECT profile_high AS owner, profile_low AS other FROM community_connections WHERE status = 'accepted'
               )
               SELECT target.owner AS profile_id, COUNT(DISTINCT mine.other)::int AS mutual_count
               FROM edges mine
               JOIN edges target ON target.other = mine.other AND target.owner <> :profile_id
               WHERE mine.owner = :profile_id
               GROUP BY target.owner"""
        ),
        {"profile_id": mine["id"]},
    ).mappings().all()
    mutuals = {str(row["profile_id"]): row["mutual_count"] for row in mutual_rows}

    return {
        "items": [
            {
                "id": str(row["id"]),
                "name": row["full_name"],
                "place": row["city"] or "",
                "skills": list(row["skills"] or []),
                "initials": "".join(part[0] for part in row["full_name"].split()[:2]).upper(),
                "postCount": int(row["post_count"]),
                "mutualConnections": mutuals.get(str(row["id"]), 0),
                "connectionStatus": by_person.get(str(row["id"]), {}).get("status", "none"),
                "connectionId": by_person.get(str(row["id"]), {}).get("connectionId"),
            }
            for row in rows
        ]
    }


def _connection_person(row, profile_id: UUID) -> dict[str, Any]:
    other_id = row["recipient_id"] if row["requested_by"] == profile_id else row["requested_by"]
    other_name = row["recipient_name"] if row["requested_by"] == profile_id else row["requester_name"]
    other_place = row["recipient_city"] if row["requested_by"] == profile_id else row["requester_city"]
    other_skills = row["recipient_skills"] if row["requested_by"] == profile_id else row["requester_skills"]
    return {
        "id": str(row["id"]),
        "profileId": str(other_id),
        "name": other_name,
        "place": other_place or "",
        "skills": list(other_skills or []),
        "createdAt": row["created_at"].isoformat(),
    }


@router.get("/connections")
def list_connections(user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    rows = db.execute(
        text(
            """SELECT c.id, c.requested_by, c.recipient_id, c.status, c.created_at,
                      requester.full_name AS requester_name, requester.city AS requester_city, requester.skills AS requester_skills,
                      recipient.full_name AS recipient_name, recipient.city AS recipient_city, recipient.skills AS recipient_skills
               FROM community_connections c
               JOIN volunteer_profiles requester ON requester.id = c.requested_by
               JOIN volunteer_profiles recipient ON recipient.id = c.recipient_id
               WHERE c.requested_by = :profile_id OR c.recipient_id = :profile_id
               ORDER BY c.created_at DESC"""
        ),
        {"profile_id": mine["id"]},
    ).mappings().all()
    incoming, outgoing, accepted = [], [], []
    for row in rows:
        item = _connection_person(row, mine["id"])
        if row["status"] == "accepted":
            accepted.append(item)
        elif row["status"] == "pending" and row["recipient_id"] == mine["id"]:
            incoming.append(item)
        elif row["status"] == "pending":
            outgoing.append(item)
    return {"incoming": incoming, "outgoing": outgoing, "accepted": accepted}


@router.post("/connections", status_code=status.HTTP_201_CREATED)
def request_connection(body: ConnectionCreate, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    if body.profile_id == mine["id"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You cannot connect with yourself.")
    target = db.execute(
        text(
            """SELECT id, full_name FROM volunteer_profiles
               WHERE id = :id AND status = 'Active' AND user_id IS NOT NULL
                 AND community_visible IS TRUE
                 AND lower(COALESCE(email, '')) NOT LIKE 'demo.%@example.org'"""
        ),
        {"id": body.profile_id},
    ).mappings().first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer profile not found.")
    low, high = sorted((str(mine["id"]), str(body.profile_id)))
    row = db.execute(
        text(
            """INSERT INTO community_connections (profile_low, profile_high, requested_by, recipient_id)
               VALUES (:low, :high, :requester, :recipient)
               ON CONFLICT (profile_low, profile_high) DO UPDATE
                   SET requested_by = EXCLUDED.requested_by, recipient_id = EXCLUDED.recipient_id,
                       status = 'pending', created_at = now(), updated_at = now()
                   WHERE community_connections.status = 'declined'
               RETURNING id, status, requested_by, recipient_id"""
        ),
        {"low": low, "high": high, "requester": mine["id"], "recipient": body.profile_id},
    ).mappings().first()
    if row is None:
        row = db.execute(
            text("SELECT id, status, requested_by, recipient_id FROM community_connections WHERE profile_low=:low AND profile_high=:high"),
            {"low": low, "high": high},
        ).mappings().one()
        if row["status"] == "accepted":
            return {"id": str(row["id"]), "status": "connected"}
        if row["requested_by"] == mine["id"]:
            return {"id": str(row["id"]), "status": "pending"}
        raise HTTPException(status.HTTP_409_CONFLICT, "This volunteer has already sent you a request. Accept or decline it in Requests.")
    db.execute(
        text(
            """INSERT INTO community_notifications (recipient_profile_id, actor_profile_id, kind, title, body, connection_id)
               VALUES (:recipient, :actor, 'connection_request', 'New connection request', :body, :connection_id)"""
        ),
        {"recipient": body.profile_id, "actor": mine["id"], "body": f"{mine['full_name']} sent you a connection request.", "connection_id": row["id"]},
    )
    db.commit()
    return {"id": str(row["id"]), "status": row["status"]}


@router.patch("/connections/{connection_id}")
def decide_connection(connection_id: UUID, body: ConnectionDecision, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    relation = db.execute(
        text("SELECT id, requested_by, recipient_id, status FROM community_connections WHERE id = :id"),
        {"id": connection_id},
    ).mappings().first()
    if not relation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection request not found.")
    if relation["recipient_id"] != mine["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the recipient can respond to this request.")
    if relation["status"] != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "This connection request has already been resolved.")
    next_status = "accepted" if body.action == "accept" else "declined"
    db.execute(
        text("UPDATE community_connections SET status = :status, updated_at = now() WHERE id = :id"),
        {"status": next_status, "id": connection_id},
    )
    if next_status == "accepted":
        db.execute(
            text(
                """INSERT INTO community_notifications (recipient_profile_id, actor_profile_id, kind, title, body, connection_id)
                   VALUES (:recipient, :actor, 'connection_accepted', 'Connection request accepted', :body, :connection_id)"""
            ),
            {"recipient": relation["requested_by"], "actor": mine["id"], "body": f"{mine['full_name']} accepted your connection request.", "connection_id": connection_id},
        )
    db.commit()
    return {"id": str(connection_id), "status": next_status}


@router.post("/posts/{post_id}/reports", status_code=status.HTTP_201_CREATED)
def report_post(post_id: UUID, body: ReportCreate, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    post = db.execute(
        text("SELECT id, author_profile_id FROM community_posts WHERE id = :id AND status = 'published'"),
        {"id": post_id},
    ).mappings().first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found.")
    if post["author_profile_id"] == mine["id"]:
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot report your own post.")
    reason = body.reason.strip()
    if not reason:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Add a reason for the report.")
    existing = db.execute(
        text("SELECT id FROM community_post_reports WHERE post_id=:post_id AND reporter_profile_id=:reporter AND status='pending'"),
        {"post_id": post_id, "reporter": mine["id"]},
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already reported this post.")
    report = db.execute(
        text(
            """INSERT INTO community_post_reports (post_id, reporter_profile_id, reason)
               VALUES (:post_id, :reporter, :reason)
               ON CONFLICT (post_id, reporter_profile_id) WHERE status = 'pending' DO NOTHING
               RETURNING id"""
        ),
        {"post_id": post_id, "reporter": mine["id"], "reason": reason},
    ).mappings().first()
    if not report:
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already reported this post.")
    db.commit()
    return {"id": str(report["id"]), "status": "pending"}


@router.patch("/notifications/read")
def update_notification_read(body: NotificationReadUpdate, user: CurrentUser, db: DbSession):
    _require_portal_user(user)
    mine = _my_profile(db, user)
    db.execute(
        text(
            """UPDATE community_notifications
               SET read_at = CASE WHEN :is_read THEN now() ELSE NULL END
               WHERE recipient_profile_id = :profile_id AND id = ANY(:ids)"""
        ),
        {"is_read": body.is_read, "profile_id": mine["id"], "ids": body.ids},
    )
    db.commit()
    return {"updated": len(body.ids)}


@router.get("/admin/reports")
def moderation_reports(user: CurrentUser, db: DbSession):
    _require_admin(user)
    reports = db.execute(
        text(
            """SELECT r.id, r.post_id, r.reason, r.created_at,
                      reporter.full_name AS reporter_name
               FROM community_post_reports r
               JOIN volunteer_profiles reporter ON reporter.id = r.reporter_profile_id
               WHERE r.status = 'pending'
               ORDER BY r.created_at ASC
               LIMIT 200"""
        )
    ).mappings().all()
    items = []
    for report in reports:
        post = _get_post(db, report["post_id"], None, include_hidden=True)
        items.append(
            {
                "id": str(report["id"]),
                "reason": report["reason"],
                "createdAt": report["created_at"].isoformat(),
                "reporterName": report["reporter_name"],
                "post": post,
            }
        )
    return {"items": items}


@router.post("/admin/reports/{report_id}/decision")
def decide_report(report_id: UUID, body: ReportDecision, user: CurrentUser, db: DbSession):
    _require_admin(user)
    report = db.execute(
        text("SELECT id, post_id FROM community_post_reports WHERE id = :id AND status = 'pending'"),
        {"id": report_id},
    ).mappings().first()
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pending report not found.")
    if body.action == "remove":
        db.execute(
            text("UPDATE community_posts SET status='hidden', moderated_by=:admin, moderation_note=:note, moderated_at=now() WHERE id=:post_id"),
            {"admin": user.id, "note": body.note.strip(), "post_id": report["post_id"]},
        )
        report_status = "actioned"
    else:
        report_status = "dismissed"
    db.execute(
        text(
            """UPDATE community_post_reports
               SET status = :status, resolved_by = :admin, resolution_note = :note, resolved_at = now()
               WHERE id = :id"""
        ),
        {"status": report_status, "admin": user.id, "note": body.note.strip(), "id": report_id},
    )
    db.commit()
    return {"id": str(report_id), "status": report_status}
