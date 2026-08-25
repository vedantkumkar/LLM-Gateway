from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.schemas import User


security = HTTPBearer(auto_error=False)


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


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "Missing bearer token"})
    user = DEMO_USERS.get(credentials.credentials)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "Invalid bearer token"})
    return user

