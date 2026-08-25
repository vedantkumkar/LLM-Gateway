from fastapi import APIRouter, Depends

from app.api.state import get_gateway_service
from app.auth.authentication import get_current_user
from app.schemas.schemas import AnalyzeResponse, ChatRequest, User
from app.services.gateway_service import GatewayService

router = APIRouter(prefix="/analyze", tags=["analysis"])


@router.post("", response_model=AnalyzeResponse)
async def analyze_message(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    gateway: GatewayService = Depends(get_gateway_service),
) -> AnalyzeResponse:
    return gateway.analyze(request, user)

