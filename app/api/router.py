from fastapi import APIRouter

from app.api import analyze, audit, chat, metrics, models, policies, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(chat.router)
api_router.include_router(analyze.router)
api_router.include_router(audit.router)
api_router.include_router(metrics.router)
api_router.include_router(models.router)
api_router.include_router(users.router)
api_router.include_router(policies.router)

