import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import logging
from urllib.parse import urlparse

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.database import get_db
from app.database.models import UserProfile
from app.schemas.schemas import User


security = HTTPBearer(auto_error=False)
SUPABASE_IDENTITY_CACHE_TTL = timedelta(seconds=45)
_supabase_identity_cache: dict[str, tuple[datetime, dict[str, object]]] = {}
_supabase_identity_inflight: dict[str, asyncio.Task[dict[str, object]]] = {}
logger = logging.getLogger("app.auth")


DEMO_USERS: dict[str, User] = {
    "admin-demo-token": User(
        id="u-admin",
        name="Admin Demo",
        email="admin@example.com",
        role="admin",
        department="Security",
    ),
    "security-demo-token": User(
        id="u-security",
        name="Security Analyst Demo",
        email="security@example.com",
        role="security_analyst",
        department="Security",
    ),
    "developer-demo-token": User(
        id="u-dev",
        name="Developer Demo",
        email="developer@example.com",
        role="developer",
        department="Engineering",
    ),
    "employee-demo-token": User(
        id="u-employee",
        name="Employee Demo",
        email="employee@example.com",
        role="employee",
        department="Operations",
    ),
    "auditor-demo-token": User(
        id="u-auditor",
        name="Auditor Demo",
        email="auditor@example.com",
        role="auditor",
        department="Compliance",
    ),
}


def _auth_error(message: str = "Invalid bearer token") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": message})


def _safe_supabase_host(url: str) -> str:
    host = urlparse(url).hostname
    return host or "invalid"


def _auth_diag(reason: str, **fields: object) -> None:
    details = " ".join(f"{key}={value}" for key, value in fields.items())
    logger.warning("AUTH_DIAG %s%s%s", reason, " " if details else "", details)


def _profile_to_user(profile: UserProfile) -> User:
    return User(
        id=profile.id,
        name=profile.name or profile.email.split("@")[0],
        email=profile.email,
        role=profile.role,
        department=profile.department,
    )


async def _fetch_supabase_user(token: str, settings: Settings) -> dict[str, object]:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        _auth_diag(
            "supabase_config_missing",
            url_present=bool(settings.supabase_url),
            key_present=bool(settings.supabase_publishable_key),
        )
        raise _auth_error("Supabase authentication is not configured")
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        _auth_diag(
            "supabase_network_error",
            error_type=type(exc).__name__,
            supabase_host=_safe_supabase_host(settings.supabase_url),
        )
        raise _auth_error() from exc
    if response.status_code != 200:
        _auth_diag(
            "supabase_user_rejected",
            status=response.status_code,
            supabase_host=_safe_supabase_host(settings.supabase_url),
        )
        raise _auth_error()
    try:
        payload = response.json()
    except ValueError as exc:
        _auth_diag("supabase_invalid_json", supabase_host=_safe_supabase_host(settings.supabase_url))
        raise _auth_error() from exc
    if not isinstance(payload, dict):
        _auth_diag("supabase_invalid_payload", supabase_host=_safe_supabase_host(settings.supabase_url))
        raise _auth_error()
    _auth_diag("supabase_identity_ok", supabase_host=_safe_supabase_host(settings.supabase_url))
    return payload


async def _get_supabase_identity(token: str, settings: Settings) -> dict[str, object]:
    cache_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    cached = _supabase_identity_cache.get(cache_key)
    if cached is not None:
        expires_at, payload = cached
        if expires_at > now:
            return payload
        _supabase_identity_cache.pop(cache_key, None)
    inflight = _supabase_identity_inflight.get(cache_key)
    if inflight is not None:
        payload = await inflight
    else:
        task = asyncio.create_task(_fetch_supabase_user(token, settings))
        _supabase_identity_inflight[cache_key] = task
        try:
            payload = await task
        finally:
            if _supabase_identity_inflight.get(cache_key) is task:
                _supabase_identity_inflight.pop(cache_key, None)
    _supabase_identity_cache[cache_key] = (datetime.now(timezone.utc) + SUPABASE_IDENTITY_CACHE_TTL, payload)
    return payload


def _name_from_supabase(payload: dict[str, object], email: str) -> str:
    metadata = payload.get("user_metadata")
    if isinstance(metadata, dict):
        for key in ("name", "full_name", "display_name"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return email.split("@")[0]


def _bootstrap_profile(db: Session, payload: dict[str, object], settings: Settings) -> UserProfile:
    user_id = payload.get("id")
    email = payload.get("email")
    if not isinstance(user_id, str) or not user_id:
        _auth_diag("supabase_invalid_payload")
        raise _auth_error()
    if not isinstance(email, str) or not email:
        _auth_diag("supabase_invalid_payload")
        raise _auth_error()
    normalized_email = email.lower()
    profile = db.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(
            id=user_id,
            email=normalized_email,
            name=_name_from_supabase(payload, normalized_email),
            role="admin" if normalized_email in settings.bootstrap_admin_email_set else "employee",
            department="Operations",
            status="active",
        )
        db.add(profile)
    profile.email = normalized_email
    profile.last_active = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    if profile.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "User account is suspended"})
    return profile


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        _auth_diag("missing_bearer_token")
        raise _auth_error("Missing bearer token")
    auth_backend = settings.auth_backend.strip().lower()
    if auth_backend == "demo":
        user = DEMO_USERS.get(credentials.credentials)
        if not user:
            _auth_diag("demo_token_rejected")
            raise _auth_error()
        return user
    if auth_backend == "supabase":
        payload = await _get_supabase_identity(credentials.credentials, settings)
        return _profile_to_user(_bootstrap_profile(db, payload, settings))
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"message": "Invalid AUTH_BACKEND"})
