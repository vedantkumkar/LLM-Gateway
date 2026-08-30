from fastapi import APIRouter, Depends

from app.auth.authentication import get_current_user
from app.schemas.schemas import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=User)
async def read_current_user(user: User = Depends(get_current_user)) -> User:
    return user
