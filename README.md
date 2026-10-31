# Hope Foundation – Volunteer Portal

User-facing app for volunteers. It uses the **same backend, database and login** as the NGO Management System, so
everything syncs both ways with the admin app (staff see applications/profiles; volunteers see assignments/hours).

## 1. Patch the main backend (one-time)
Copy the contents of `backend-patch/` over `NGO_Management_System/ngo/backend/`:

| File | What it does |
|---|---|
| `app/api/portal.py` (new) | `/api/portal/*` self-service endpoints |
| `alembic/versions/0005_volunteer_portal.py` (new) | adds columns to `volunteer_applications` / `volunteer_profiles` |
| `app/main.py`, `app/config.py` (replace) | registers the router; allows portal origins (`PORTAL_ORIGINS`, default `http://localhost:5175`, `http://127.0.0.1:5175`, `http://localhost:8443`, and `http://127.0.0.1:8443`) |

Then `cd ngo/backend && python -m alembic upgrade head` (or just run `python start.py` in `ngo/`) and restart the API.

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

Local-only (not in the main system yet): Posts, Networking, avatar photo, notification/privacy toggles.
Password reset is handled by an administrator (main system has no self-service reset).
