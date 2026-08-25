from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.api.state import get_rate_limiter
from app.config import get_settings
from app.database.database import SessionLocal, init_db
from app.schemas.schemas import HealthResponse

settings = get_settings()

app = FastAPI(
    title=settings.app_title,
    description="Security proxy for enterprise LLM traffic with PII, secret, injection, policy, and audit controls.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    database_status = "connected"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        database_status = "unavailable"
    return HealthResponse(
        status="healthy",
        gateway="operational",
        database=database_status,
        rate_limiter=get_rate_limiter().status(),
        llm_provider=settings.llm_provider,
    )


app.include_router(api_router)

