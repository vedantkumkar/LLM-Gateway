from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.authentication import DEMO_USERS
from app.auth.rbac import ROLE_PERMISSIONS, require_permission
from app.config import Settings, get_settings
from app.database.database import get_db
from app.database.models import UserProfile
from app.schemas.schemas import User, UserProfileResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/permissions")
async def list_role_permissions(_: User = Depends(require_permission("users:read"))) -> dict[str, list[str]]:
    return {role: sorted(permissions) for role, permissions in ROLE_PERMISSIONS.items()}


@router.get("", response_model=list[UserProfileResponse])
async def list_users(
    _: User = Depends(require_permission("users:read")),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> list[UserProfileResponse] | list[UserProfile]:
    if settings.auth_backend.strip().lower() == "demo":
        now = datetime.now(timezone.utc)
        return [
            UserProfileResponse(
                **user.model_dump(),
                status="active",
                created_at=now,
                updated_at=now,
                last_active=now,
            )
            for user in {user.id: user for user in DEMO_USERS.values()}.values()
        ]
    profiles = db.scalars(select(UserProfile).order_by(UserProfile.email.asc())).all()
    return list(profiles)


@router.patch("/{user_id}", response_model=UserProfileResponse)
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    _: User = Depends(require_permission("users:write")),
    db: Session = Depends(get_db),
) -> UserProfile:
    profile = db.get(UserProfile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "User not found"})
    if payload.role is not None:
        if profile.role == "admin" and payload.role != "admin":
            active_admins = db.scalar(
                select(func.count(UserProfile.id)).where(
                    UserProfile.role == "admin",
                    UserProfile.status == "active",
                )
            )
            if active_admins is not None and active_admins <= 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": "Cannot remove the last active admin"})
        profile.role = payload.role
    if payload.department is not None:
        profile.department = payload.department
    if payload.status is not None:
        if profile.role == "admin" and payload.status != "active":
            active_admins = db.scalar(
                select(func.count(UserProfile.id)).where(
                    UserProfile.role == "admin",
                    UserProfile.status == "active",
                )
            )
            if active_admins is not None and active_admins <= 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": "Cannot suspend the last active admin"})
        profile.status = payload.status
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return profile
