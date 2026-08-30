from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.rbac import require_permission
from app.config import Settings, get_settings
from app.database.database import get_db
from app.database.models import GatewaySettingsRecord, PolicyRecord
from app.schemas.schemas import GatewaySettingsResponse, User

router = APIRouter(prefix="/settings", tags=["settings"])


def _record_to_response(record: GatewaySettingsRecord) -> GatewaySettingsResponse:
    return GatewaySettingsResponse(
        general={
            "organization": record.organization,
            "environment": record.environment,
            "defaultModel": record.default_model,
        },
        security={
            "defaultRiskThreshold": record.default_risk_threshold,
            "injectionThreshold": record.injection_threshold,
            "piiHandling": record.pii_handling,
            "enableResponseScanning": record.enable_response_scanning,
            "enableSecretDetection": record.enable_secret_detection,
        },
        rateLimits={
            "maxRequestsPerMinute": record.max_requests_per_minute,
            "burstAllowance": record.burst_allowance,
        },
        audit={"retentionDays": record.audit_retention_days, "immutableStorage": True},
        notifications={
            "criticalEmail": record.critical_notifications,
            "slackAlerts": False,
            "weeklyDigest": False,
        },
        developer={"enableSemanticCache": False, "verboseLogging": False},
    )


def _get_record(db: Session, settings: Settings) -> GatewaySettingsRecord:
    record = db.get(GatewaySettingsRecord, "default")
    if record is None:
        record = GatewaySettingsRecord(
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
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def _sync_policy_settings(db: Session, record: GatewaySettingsRecord) -> None:
    policy_by_category = {policy.category: policy for policy in db.query(PolicyRecord).all()}
    if injection := policy_by_category.get("Prompt Injection"):
        injection.threshold = record.injection_threshold
        injection.enabled = True
        injection.action = "Block"
    if pii := policy_by_category.get("PII"):
        pii.enabled = record.pii_handling != "Alert"
        pii.action = record.pii_handling
    if secret := policy_by_category.get("Secrets"):
        secret.enabled = record.enable_secret_detection
        secret.action = "Block"
    db.commit()


def _sync_rate_limiter(record: GatewaySettingsRecord) -> None:
    from app.api.state import get_rate_limiter

    limiter = get_rate_limiter()
    if hasattr(limiter, "requests_per_minute"):
        limiter.requests_per_minute = record.max_requests_per_minute


@router.get("", response_model=GatewaySettingsResponse)
async def get_gateway_settings(
    _: User = Depends(require_permission("metrics:read")),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> GatewaySettingsResponse:
    return _record_to_response(_get_record(db, settings))


@router.put("", response_model=GatewaySettingsResponse)
async def update_gateway_settings(
    payload: GatewaySettingsResponse,
    _: User = Depends(require_permission("users:write")),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> GatewaySettingsResponse:
    record = _get_record(db, settings)
    record.organization = payload.general.organization
    record.environment = payload.general.environment
    record.default_model = payload.general.defaultModel
    record.default_risk_threshold = payload.security.defaultRiskThreshold
    record.injection_threshold = payload.security.injectionThreshold
    record.pii_handling = payload.security.piiHandling
    record.enable_response_scanning = payload.security.enableResponseScanning
    record.enable_secret_detection = payload.security.enableSecretDetection
    record.max_requests_per_minute = payload.rateLimits.maxRequestsPerMinute
    record.burst_allowance = payload.rateLimits.burstAllowance
    record.audit_retention_days = payload.audit.retentionDays
    record.critical_notifications = payload.notifications.criticalEmail
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    _sync_policy_settings(db, record)
    _sync_rate_limiter(record)
    return _record_to_response(record)
