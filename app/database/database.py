from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _connect_args(database_url: str) -> dict[str, object]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


settings = get_settings()
engine = create_engine(settings.database_url, connect_args=_connect_args(settings.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_policies()
    seed_default_settings()


def seed_default_policies() -> None:
    from app.database.models import DEFAULT_POLICIES, PolicyRecord

    with SessionLocal() as db:
        if db.query(PolicyRecord).count() == 0:
            db.add_all(PolicyRecord(**policy) for policy in DEFAULT_POLICIES)
            db.commit()


def seed_default_settings() -> None:
    from app.config import get_settings
    from app.database.models import GatewaySettingsRecord

    settings = get_settings()
    with SessionLocal() as db:
        if db.get(GatewaySettingsRecord, "default") is None:
            db.add(
                GatewaySettingsRecord(
                    id="default",
                    organization="SentinelAI",
                    environment=settings.app_env,
                    default_model=settings.gemini_model,
                    default_risk_threshold=settings.prompt_injection_block_threshold,
                    injection_threshold=settings.prompt_injection_block_threshold,
                    pii_handling="Block" if settings.pii_action == "BLOCK" else "Redact",
                    enable_response_scanning=settings.response_scanning_enabled,
                    enable_secret_detection=settings.secret_action == "BLOCK",
                    max_requests_per_minute=settings.rate_limit_per_minute,
                    burst_allowance=0,
                    audit_retention_days=90,
                    critical_notifications=True,
                )
            )
            db.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
