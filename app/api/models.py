from fastapi import APIRouter, Depends

from app.auth.authentication import get_current_user
from app.auth.rbac import MODEL_ACCESS, can_access_model
from app.schemas.schemas import User

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
async def list_models(user: User = Depends(get_current_user)) -> list[dict[str, object]]:
    models = []
    for model, roles in MODEL_ACCESS.items():
        models.append(
            {
                "id": model,
                "provider": "mock",
                "enabled": True,
                "allowed_roles": sorted(roles),
                "can_access": can_access_model(user, model),
            }
        )
    return models

