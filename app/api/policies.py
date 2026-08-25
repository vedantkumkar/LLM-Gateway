from fastapi import APIRouter, Depends

from app.auth.rbac import require_permission
from app.config import Settings, get_settings
from app.schemas.schemas import User

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("")
async def get_policies(
    _: User = Depends(require_permission("policies:read")),
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    return {
        "prompt_injection_block_threshold": settings.prompt_injection_block_threshold,
        "pii_action": settings.pii_action,
        "secret_action": settings.secret_action,
        "rate_limit_per_minute": settings.rate_limit_per_minute,
        "response_scanning_enabled": settings.response_scanning_enabled,
        "local_defaults": {
            "database": "sqlite",
            "rate_limiter": "in-memory",
            "llm_provider": "mock",
        },
    }

