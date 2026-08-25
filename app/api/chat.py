from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.state import get_gateway_service, get_rate_limiter
from app.auth.authentication import get_current_user
from app.database.database import get_db
from app.schemas.schemas import ChatRequest, ChatResponse, User
from app.services.gateway_service import GatewayService
from app.services.rate_limiter import RateLimiter

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def secure_chat(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    gateway: GatewayService = Depends(get_gateway_service),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> ChatResponse:
    if not limiter.allow(user.id):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail={"message": "Rate limit exceeded"})
    return await gateway.chat(request, user, db)
