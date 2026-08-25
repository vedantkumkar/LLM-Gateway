from fastapi import APIRouter, Depends

from app.auth.authentication import DEMO_USERS
from app.auth.rbac import require_permission
from app.schemas.schemas import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[User])
async def list_users(_: User = Depends(require_permission("users:read"))) -> list[User]:
    unique_users = {user.id: user for user in DEMO_USERS.values()}
    return list(unique_users.values())

