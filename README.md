# Hope Foundation – Volunteer Portal

User-facing app for volunteers. It uses the **same backend, database and login** as the NGO Management System, so
applications, assignments, contribution records, community posts, comments, likes, connections and community notifications
are shared with the main system. Applicant Members and Volunteers use the volunteer workspace. Admin accounts can sign in
to the portal's moderation-only view; Project Manager, Staff and Board accounts use the main system.

## 1. Main backend integration

The current Hope Foundation backend already includes the community API (`app/api/community.py`), migration
`0007_community`, and its router registration. The community API and migration in `backend-patch/` are kept in sync
with those main-app files. The portal now consumes that API instead of storing community posts and connections in
browser storage.

The portal's `/api/portal/*` endpoints and profile migration are supplied in `backend-patch/`. Integrate only missing
files or changes into the main backend:

| File | What it does |
|---|---|
| `app/api/portal.py` | `/api/portal/*` endpoints; includes community activity in the notification inbox |
| `alembic/versions/0005_volunteer_portal.py` | links applications and volunteer profiles to portal users |
| `app/api/community.py`, `alembic/versions/0007_community.py` | persistent community API and schema; current main-app versions already match these patch files |
| `app/main.py`, `app/config.py` | reference files only; merge missing router/origin settings rather than replacing the main app files |

Do **not** copy the entire patch folder over the main backend or replace its `app/main.py`/`app/config.py`: the main
application contains additional routers and settings. The current backend database already has the community tables and
is at revision `0009_legacy_community_posts`; restart the API after updating `app/api/portal.py`.

**Migration caveat:** the main backend's source files `0008_community_privacy.py` and `0009_legacy_community_posts.py`
are currently empty. As a result, Alembic cannot load the migration chain (`alembic current` reports that it cannot
determine a revision ID). The configured database already contains the community tables, but restore those migration
scripts before attempting future upgrades or applying this patch to another database.

## 2. Run the portal
```
npm install
npm run dev        # http://localhost:5175  (proxies /api -> http://127.0.0.1:8000)
```
Set `API_PROXY_TARGET` if the API is elsewhere. In production serve both behind one domain (or add the portal origin to `PORTAL_ORIGINS`).

## How it syncs
- **Sign up / sign in**: main `/api/auth/*` (cookie session). New sign-ups are `Member`; a volunteer profile is created automatically.
- **Staff approve** the application in the admin app (People → Volunteers) → profile becomes `Active` → the user's role is promoted to `Volunteer` on next load.
- **Projects / Events** shown are live `projects` (Active/Upcoming) and `events` (Scheduled).
- **Apply** creates a `volunteer_applications` row (visible in admin Applications tab).
- **Assignments / hours** come from `volunteer_assignments` and `volunteer_attendance` that staff enter in the admin app.
- **Profile, skills, availability** are saved to `volunteer_profiles`.
- **Community** uses the main app's `community_posts`, `community_post_comments`, `community_post_likes`,
  `community_connections`, `community_post_reports` and `community_notifications` tables. Only active volunteer
  profiles are discoverable; contact details are not returned by the directory endpoint.
- **Community notifications** (likes, comments, connection requests and accepted requests) are returned in the portal
  inbox, and their read/unread state is updated in the backend.
- **Moderation** is available to Admin accounts in the portal; staff can dismiss a report or hide the reported post.

Local-only: avatar photo and notification/privacy preference toggles. Post text, post images, comments, likes, reports,
connection requests and accepted connections are server-backed.
Password reset is handled by an administrator (main system has no self-service reset).
