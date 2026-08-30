from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.auth.authentication import get_current_user
from app.schemas.schemas import User


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {"*"},
    "security_analyst": {
        "audit:read_all",
        "metrics:read",
        "models:read",
        "playground:use",
        "users:read",
        "policies:read",
        "policies:write",
    },
    "developer": {"audit:read_own", "models:read", "playground:use", "policies:read"},
    "employee": {"audit:read_own", "models:read", "playground:use"},
    "auditor": {"audit:read_all", "metrics:read", "policies:read"},
}

MODEL_ACCESS: dict[str, set[str]] = {
    "internal-secure-llm": {"admin", "security_analyst", "developer", "employee"},
    "mock-secure-llm": {"admin", "security_analyst", "developer", "employee"},
    "gpt-enterprise-demo": {"admin", "security_analyst", "developer"},
    "claude-enterprise-demo": {"admin", "security_analyst"},
}


def has_permission(user: User, permission: str) -> bool:
    permissions = ROLE_PERMISSIONS.get(user.role, set())
    return "*" in permissions or permission in permissions


def require_permission(permission: str) -> Callable[[User], User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "Insufficient permissions"})
        return user

    return dependency


def can_access_model(user: User, model: str) -> bool:
    allowed_roles = MODEL_ACCESS.get(model)
    return user.role == "admin" or (allowed_roles is not None and user.role in allowed_roles)
