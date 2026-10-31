"""Self-service API for the Volunteer Portal (/api/portal/*).

Reuses the main system's cookie session, `users`, `volunteer_profiles`, `volunteer_applications`,
`volunteer_assignments`, `volunteer_attendance`, `projects` and `events` tables, so everything a
volunteer does in the portal is visible to staff in the admin app and vice versa.
"""
from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession

router = APIRouter(prefix="/api/portal", tags=["volunteer portal"])
PORTAL_ROLES = {"Member", "Volunteer", "Admin", "Project Manager", "Staff"}
OPEN_APPLICATION = ("New", "Applied", "Under Review", "Approved")
DISPLAY_STATUS = {"New": "Pending", "Applied": "Pending", "Under Review": "Under review", "Approved": "Approved", "Rejected": "Rejected"}


def _guard(user) -> None:
    if user.role not in PORTAL_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The volunteer portal is not available for your account.")


def _iso(value: Any) -> str | None:
    return value.isoformat() if isinstance(value, (date, datetime)) else value


def _profile(db, user, create: bool = True):
    row = db.execute(text("SELECT * FROM volunteer_profiles WHERE user_id = :u"), {"u": user.id}).mappings().first()
    if row:
        return row
    row = db.execute(
        text("SELECT * FROM volunteer_profiles WHERE user_id IS NULL AND lower(email) = lower(:e) ORDER BY created_at LIMIT 1"),
        {"e": user.email},
    ).mappings().first()
    if row:  # profile created by staff (e.g. approved application) -> link it to this login
        db.execute(text("UPDATE volunteer_profiles SET user_id = :u WHERE id = :i"), {"u": user.id, "i": row["id"]})
    elif create and user.role in {"Member", "Volunteer"}:
        row = db.execute(
            text("INSERT INTO volunteer_profiles (user_id, full_name, email, status) VALUES (:u, :n, lower(:e), 'Applicant') RETURNING id"),
            {"u": user.id, "n": user.full_name, "e": user.email},
        ).mappings().first()
    else:
        return None
    db.commit()
    return db.execute(text("SELECT * FROM volunteer_profiles WHERE id = :i"), {"i": row["id"]}).mappings().first()


def _sync_role(db, user, profile) -> None:
    """Staff approved this person as a volunteer -> unlock the Volunteer role automatically."""
    if profile and profile["status"] == "Active" and user.role == "Member":
        db.execute(text("UPDATE users SET role = 'Volunteer' WHERE id = :u"), {"u": user.id})
        db.commit()
        user.role = "Volunteer"


def _profile_json(p, user) -> dict:
    return {
        "id": str(p["id"]), "fullName": p["full_name"], "email": p["email"] or user.email, "phone": p["phone"] or "",
        "location": p.get("city") or "", "about": p.get("about") or "", "skills": list(p["skills"] or []),
        "unavailableDays": list(p.get("unavailable_days") or []), "status": p["status"], "joinedOn": _iso(p["joined_on"]), "role": user.role,
    }


@router.get("/me")
def me(user: CurrentUser, db: DbSession):
    _guard(user)
    p = _profile(db, user)
    if not p:
        raise HTTPException(404, "No volunteer profile for this account.")
    _sync_role(db, user, p)
    stats = db.execute(
        text(
            """
            SELECT COALESCE(SUM(hours) FILTER (WHERE status IN ('Present','Late')), 0) AS hours,
                   COUNT(DISTINCT attendance_date) FILTER (WHERE status IN ('Present','Late')) AS days,
                   COUNT(DISTINCT target_label) FILTER (WHERE status IN ('Present','Late') AND assignment_kind = 'Event') AS events,
                   COUNT(DISTINCT target_label) FILTER (WHERE status IN ('Present','Late') AND assignment_kind <> 'Event') AS projects
            FROM volunteer_attendance WHERE volunteer_id = :v
            """
        ),
        {"v": p["id"]},
    ).mappings().one()
    counts = db.execute(
        text(
            """
            SELECT (SELECT COUNT(*) FROM volunteer_applications WHERE user_id = :u OR lower(email) = lower(:e)) AS applications,
                   (SELECT COUNT(*) FROM volunteer_applications WHERE (user_id = :u OR lower(email) = lower(:e)) AND status IN ('New','Applied','Under Review')) AS active_applications,
                   (SELECT COUNT(*) FROM volunteer_assignments WHERE volunteer_id = :v AND status IN ('Pending','Active')) AS assignments
            """
        ),
        {"u": user.id, "e": user.email, "v": p["id"]},
    ).mappings().one()
    return {
        "profile": _profile_json(p, user),
        "stats": {"hours": float(stats["hours"]), "days": stats["days"], "events": stats["events"], "projects": stats["projects"],
                  "applications": counts["applications"], "activeApplications": counts["active_applications"], "assignments": counts["assignments"]},
    }


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, alias="fullName", min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    about: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = None
    unavailable_days: list[str] | None = Field(default=None, alias="unavailableDays")
    model_config = {"populate_by_name": True}


@router.patch("/me")
def update_me(body: ProfileUpdate, user: CurrentUser, db: DbSession):
    _guard(user)
    p = _profile(db, user)
    if not p:
        raise HTTPException(404, "No volunteer profile for this account.")
    columns = {"full_name": body.full_name, "phone": body.phone, "city": body.location, "about": body.about,
               "skills": [s.strip() for s in body.skills if s.strip()][:40] if body.skills is not None else None,
               "unavailable_days": body.unavailable_days}
    values = {k: v for k, v in columns.items() if v is not None}
    if values:
        sets = ", ".join(f"{k} = :{k}" for k in values)
        db.execute(text(f"UPDATE volunteer_profiles SET {sets}, updated_at = now() WHERE id = :id"), {**values, "id": p["id"]})
        if "full_name" in values:
            db.execute(text("UPDATE users SET full_name = :n WHERE id = :u"), {"n": values["full_name"], "u": user.id})
        db.commit()
    return _profile_json(_profile(db, user), user)


def _project_card(r) -> dict:
    geo = r["geography"] or {}
    place = ", ".join(str(v) for v in geo.values() if isinstance(v, str) and v) if isinstance(geo, dict) else ""
    return {"id": str(r["id"]), "kind": "project", "title": r["name"], "type": r["sector"], "location": place, "summary": r["summary"] or r["why"],
            "description": r["problem_statement"] or r["why"], "startsAt": _iso(r["start_date"]), "endsAt": _iso(r["end_date"]),
            "status": r["status"], "organiser": r["manager_name"] or "Hope Foundation", "skills": [], "capacity": None, "registered": None}


def _event_card(r) -> dict:
    return {"id": str(r["id"]), "kind": "event", "title": r["title"], "type": r["event_type"], "location": r["location"], "summary": (r["description"] or "")[:160],
            "description": r["description"], "startsAt": _iso(r["starts_at"]), "endsAt": _iso(r["ends_at"]), "status": r["status"],
            "organiser": r["organizer"] or "Hope Foundation", "skills": [], "capacity": r["capacity"], "registered": r["registered"]}


_PROJECTS = """SELECT p.*, u.full_name AS manager_name FROM projects p LEFT JOIN users u ON u.id = p.manager_id
               WHERE p.archived_at IS NULL AND p.status IN ('Active','Upcoming')"""
_EVENTS = """SELECT e.*, (SELECT COUNT(*) FROM volunteer_applications a WHERE a.target_kind='Event' AND a.target_id=e.id AND a.status IN ('New','Applied','Under Review','Approved')) AS registered
             FROM events e WHERE e.status = 'Scheduled' AND e.starts_at >= now() - interval '1 day'"""


@router.get("/opportunities")
def opportunities(user: CurrentUser, db: DbSession, kind: Literal["project", "event", "all"] = "all"):
    _guard(user)
    items: list[dict] = []
    if kind in ("project", "all"):
        items += [_project_card(r) for r in db.execute(text(_PROJECTS + " ORDER BY p.start_date NULLS LAST")).mappings()]
    if kind in ("event", "all"):
        items += [_event_card(r) for r in db.execute(text(_EVENTS + " ORDER BY e.starts_at")).mappings()]
    return {"items": items}


@router.get("/opportunities/{kind}/{target_id}")
def opportunity(kind: Literal["project", "event"], target_id: str, user: CurrentUser, db: DbSession):
    _guard(user)
    try:
        if kind == "project":
            r = db.execute(text(_PROJECTS + " AND p.id = :i"), {"i": target_id}).mappings().first()
            card = _project_card(r) if r else None
        else:
            r = db.execute(text(_EVENTS + " AND e.id = :i"), {"i": target_id}).mappings().first()
            card = _event_card(r) if r else None
    except Exception:
        db.rollback()
        card = None
    if not card:
        raise HTTPException(404, "Opportunity not found or no longer open.")
    p = _profile(db, user, create=False)
    mine = None
    if p:
        mine = db.execute(
            text("SELECT id, status FROM volunteer_applications WHERE (user_id=:u OR lower(email)=lower(:e)) AND target_kind=:k AND target_id=:t ORDER BY created_at DESC LIMIT 1"),
            {"u": user.id, "e": user.email, "k": kind.capitalize(), "t": target_id},
        ).mappings().first()
    card["myApplication"] = {"id": str(mine["id"]), "status": DISPLAY_STATUS.get(mine["status"], mine["status"])} if mine else None
    return card


class ApplyBody(BaseModel):
    kind: Literal["project", "event"]
    target_id: str = Field(alias="targetId")
    motivation: str = Field(default="", max_length=1000)
    model_config = {"populate_by_name": True}


@router.post("/applications", status_code=201)
def apply(body: ApplyBody, user: CurrentUser, db: DbSession):
    _guard(user)
    if user.role not in {"Member", "Volunteer"}:
        raise HTTPException(403, "Only volunteers and members can apply.")
    p = _profile(db, user)
    try:
        if body.kind == "project":
            t = db.execute(text("SELECT name AS label FROM projects WHERE id = :i AND archived_at IS NULL AND status IN ('Active','Upcoming')"), {"i": body.target_id}).mappings().first()
        else:
            t = db.execute(text("SELECT title AS label FROM events WHERE id = :i AND status = 'Scheduled'"), {"i": body.target_id}).mappings().first()
    except Exception:
        db.rollback()
        t = None
    if not t:
        raise HTTPException(404, "Opportunity not found or no longer open.")
    kind = body.kind.capitalize()
    if db.execute(
        text("SELECT 1 FROM volunteer_applications WHERE (user_id=:u OR lower(email)=lower(:e)) AND target_kind=:k AND target_id=:t AND status IN ('New','Applied','Under Review','Approved')"),
        {"u": user.id, "e": user.email, "k": kind, "t": body.target_id},
    ).first():
        raise HTTPException(409, "You have already applied for this opportunity.")
    row = db.execute(
        text(
            """INSERT INTO volunteer_applications (full_name, email, phone, skills, motivation, status, user_id, target_kind, target_id, target_label)
               VALUES (:n, lower(:e), :ph, :sk, :m, 'Applied', :u, :k, :t, :l) RETURNING id"""
        ),
        {"n": p["full_name"], "e": user.email, "ph": p["phone"] or "", "sk": list(p["skills"] or []), "m": body.motivation, "u": user.id, "k": kind, "t": body.target_id, "l": t["label"]},
    ).mappings().one()
    db.commit()
    return {"id": str(row["id"]), "status": "Pending"}


def _application_json(r) -> dict:
    return {"id": str(r["id"]), "name": r["target_label"] or "General volunteering", "type": r["target_kind"] if r["target_kind"] != "General" else "Project",
            "targetKind": r["target_kind"].lower(), "targetId": str(r["target_id"]) if r["target_id"] else None, "status": DISPLAY_STATUS.get(r["status"], r["status"]),
            "appliedOn": _iso(r["applied_on"]), "updatedAt": _iso(r["updated_at"]), "motivation": r["motivation"]}


@router.get("/applications")
def applications(user: CurrentUser, db: DbSession):
    _guard(user)
    rows = db.execute(
        text("SELECT * FROM volunteer_applications WHERE user_id = :u OR lower(email) = lower(:e) ORDER BY created_at DESC"),
        {"u": user.id, "e": user.email},
    ).mappings().all()
    return {"items": [_application_json(r) for r in rows]}


@router.delete("/applications/{application_id}", status_code=204)
def withdraw(application_id: str, user: CurrentUser, db: DbSession):
    _guard(user)
    res = db.execute(
        text("DELETE FROM volunteer_applications WHERE id = :i AND (user_id = :u OR lower(email) = lower(:e)) AND status IN ('New','Applied')"),
        {"i": application_id, "u": user.id, "e": user.email},
    )
    db.commit()
    if not res.rowcount:
        raise HTTPException(409, "Only pending applications can be withdrawn.")


@router.get("/assignments")
def assignments(user: CurrentUser, db: DbSession):
    _guard(user)
    p = _profile(db, user, create=False)
    if not p:
        return {"items": []}
    rows = db.execute(
        text(
            """SELECT a.*, pr.name AS project_name, pr.geography, pm.full_name AS manager_name, pm.email AS manager_email,
                      ev.title AS event_title, ev.location AS event_location, ev.starts_at AS event_starts, ev.ends_at AS event_ends, ev.organizer
               FROM volunteer_assignments a
               LEFT JOIN projects pr ON pr.id = a.project_id LEFT JOIN users pm ON pm.id = pr.manager_id
               LEFT JOIN events ev ON ev.id = a.event_id
               WHERE a.volunteer_id = :v AND a.status <> 'Cancelled' ORDER BY COALESCE(a.starts_on, a.created_at::date) DESC"""
        ),
        {"v": p["id"]},
    ).mappings().all()
    today, items = date.today(), []
    for r in rows:
        geo = r["geography"] or {}
        place = r["event_location"] or (", ".join(str(v) for v in geo.values() if isinstance(v, str) and v) if isinstance(geo, dict) else "")
        starts = r["starts_on"] or (r["event_starts"].date() if r["event_starts"] else None)
        group = "Completed" if r["status"] == "Completed" else ("Upcoming" if starts and starts > today else "Current")
        items.append({"id": str(r["id"]), "title": r["target_label"] or r["event_title"] or r["project_name"] or "Assignment", "kind": r["assignment_kind"].lower(),
                      "role": r["role_title"], "responsibilities": r["responsibilities"], "startsOn": _iso(starts), "endsOn": _iso(r["ends_on"]),
                      "startsAt": _iso(r["event_starts"]), "endsAt": _iso(r["event_ends"]), "location": place, "status": r["status"], "group": group,
                      "contactName": r["manager_name"] or r["organizer"] or "Hope Foundation", "contactEmail": r["manager_email"]})
    return {"items": items}


@router.get("/contributions")
def contributions(user: CurrentUser, db: DbSession):
    _guard(user)
    p = _profile(db, user, create=False)
    if not p:
        return {"items": [], "monthly": [], "byKind": []}
    rows = db.execute(
        text(
            """SELECT att.attendance_date, att.status, att.hours, att.assignment_kind, att.target_label, a.role_title
               FROM volunteer_attendance att LEFT JOIN volunteer_assignments a ON a.id = att.assignment_id
               WHERE att.volunteer_id = :v ORDER BY att.attendance_date DESC LIMIT 200"""
        ),
        {"v": p["id"]},
    ).mappings().all()
    monthly = db.execute(
        text(
            """SELECT to_char(date_trunc('month', attendance_date), 'Mon') AS month, date_trunc('month', attendance_date) AS m, SUM(hours) AS hours
               FROM volunteer_attendance WHERE volunteer_id = :v AND status IN ('Present','Late') AND attendance_date >= date_trunc('month', now()) - interval '5 months'
               GROUP BY 1, 2 ORDER BY m"""
        ),
        {"v": p["id"]},
    ).mappings().all()
    kinds = db.execute(
        text("SELECT assignment_kind AS kind, SUM(hours) AS hours FROM volunteer_attendance WHERE volunteer_id=:v AND status IN ('Present','Late') GROUP BY 1 ORDER BY 2 DESC"),
        {"v": p["id"]},
    ).mappings().all()
    return {
        "items": [{"date": _iso(r["attendance_date"]), "name": r["target_label"] or "Volunteering", "kind": r["assignment_kind"], "role": r["role_title"] or "Volunteer",
                   "hours": float(r["hours"]), "status": r["status"]} for r in rows],
        "monthly": [{"month": r["month"], "hours": float(r["hours"])} for r in monthly],
        "byKind": [{"kind": r["kind"], "hours": float(r["hours"])} for r in kinds],
    }


@router.get("/notifications")
def notifications(user: CurrentUser, db: DbSession):
    """Derived from real status changes: applications decided, assignments created, hours logged."""
    _guard(user)
    p = _profile(db, user, create=False)
    out: list[dict] = []
    for r in db.execute(
        text("SELECT id, target_label, status, updated_at FROM volunteer_applications WHERE (user_id=:u OR lower(email)=lower(:e)) AND status IN ('Under Review','Approved','Rejected') ORDER BY updated_at DESC LIMIT 15"),
        {"u": user.id, "e": user.email},
    ).mappings():
        label = r["target_label"] or "your application"
        msg = {"Approved": f"You’re approved for {label}.", "Rejected": f"Your application for {label} was not successful this time.", "Under Review": f"{label} is now under review."}[r["status"]]
        out.append({"id": f"app-{r['id']}-{r['status']}", "title": f"Application {DISPLAY_STATUS[r['status']].lower()}", "body": msg, "at": _iso(r["updated_at"])})
    if p:
        for r in db.execute(text("SELECT id, role_title, target_label, created_at FROM volunteer_assignments WHERE volunteer_id=:v AND status IN ('Pending','Active') ORDER BY created_at DESC LIMIT 10"), {"v": p["id"]}).mappings():
            out.append({"id": f"asg-{r['id']}", "title": "New assignment", "body": f"You’ve been assigned as {r['role_title']}" + (f" for {r['target_label']}." if r["target_label"] else "."), "at": _iso(r["created_at"])})
        for r in db.execute(text("SELECT id, hours, target_label, created_at FROM volunteer_attendance WHERE volunteer_id=:v AND status IN ('Present','Late') ORDER BY created_at DESC LIMIT 10"), {"v": p["id"]}).mappings():
            out.append({"id": f"att-{r['id']}", "title": "Volunteer hours updated", "body": f"{float(r['hours']):g} hours from {r['target_label'] or 'your activity'} were added.", "at": _iso(r["created_at"])})
    out.sort(key=lambda n: n["at"] or "", reverse=True)
    return {"items": out[:30]}
