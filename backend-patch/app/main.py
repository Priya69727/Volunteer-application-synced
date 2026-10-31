import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.beneficiaries import router as beneficiaries_router
from app.api.communications import router as communications_router
from app.config import settings
from app.dependencies import DbSession
from app.limiter import limiter
from app.api.donors import router as donors_router
from app.api.dashboard import router as dashboard_router
from app.api.events import router as events_router
from app.api.people import router as people_router
from app.api.portal import router as portal_router
from app.api.projects import router as projects_router
from app.api.proposals import router as proposals_router
from app.api.reports import router as reports_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hope Foundation NGO Management API",
    version="1.0.0",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
    openapi_url=None if settings.environment == "production" else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# In development the UI is reachable as both localhost and 127.0.0.1; accept either so login never fails on a hostname mismatch.
ALLOWED_ORIGINS = {settings.app_origin, *[o.strip() for o in settings.portal_origins.split(",") if o.strip()]}
if settings.environment != "production":
    for _a, _b in (("//localhost", "//127.0.0.1"), ("//127.0.0.1", "//localhost")):
        if _a in settings.app_origin:
            ALLOWED_ORIGINS.add(settings.app_origin.replace(_a, _b))

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def require_expected_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    if (
        request.url.path.startswith("/api/")
        and request.method not in {"GET", "HEAD", "OPTIONS"}
        and origin
        and origin not in ALLOWED_ORIGINS
    ):
        return JSONResponse(status_code=403, content={"detail": "Request origin is not allowed."})
    return await call_next(request)


@app.get("/api/health", tags=["health"])
def health_check(db: DbSession):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database is unavailable.") from error
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(dashboard_router)
app.include_router(proposals_router)
app.include_router(projects_router)
app.include_router(beneficiaries_router)
app.include_router(donors_router)
app.include_router(events_router)
app.include_router(people_router)
app.include_router(communications_router)
app.include_router(reports_router)
app.include_router(portal_router)
