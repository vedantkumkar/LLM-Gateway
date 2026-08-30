from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.rbac import has_permission, require_permission
from app.database.database import get_db
from app.schemas.schemas import (
    AnalyticsBundleResponse,
    MetricsOverviewResponse,
    MetricsSummary,
    SecurityEventResponse,
    SecurityPostureResponse,
    TrafficPoint,
    User,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
async def metrics_summary(
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> MetricsSummary:
    return MetricsSummary(**AuditService().metrics(db))


@router.get("/overview", response_model=MetricsOverviewResponse)
async def metrics_overview(
    range: str = Query(default="24h", pattern="^(24h|7d|30d|90d)$"),
    user: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> MetricsOverviewResponse:
    service = AuditService()
    analytics = service.analytics(db, range)
    read_all = has_permission(user, "audit:read_all")
    return MetricsOverviewResponse(
        summary=MetricsSummary(**service.metrics(db)),
        posture=SecurityPostureResponse(**service.security_posture(db)),
        traffic=[TrafficPoint(**point) for point in analytics["requestVolume"]],
        security_events=[
            SecurityEventResponse(**event)
            for event in service.security_events(db, user=user, limit=6, read_all=read_all)
        ],
    )


@router.get("/analytics", response_model=AnalyticsBundleResponse)
async def metrics_analytics(
    range: str = Query(default="24h", pattern="^(24h|7d|30d|90d)$"),
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> AnalyticsBundleResponse:
    return AnalyticsBundleResponse(**AuditService().analytics(db, range))


@router.get("/traffic", response_model=list[TrafficPoint])
async def metrics_traffic(
    range: str = Query(default="24h", pattern="^(24h|7d|30d|90d)$"),
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> list[TrafficPoint]:
    return [TrafficPoint(**point) for point in AuditService().analytics(db, range)["requestVolume"]]


@router.get("/posture", response_model=SecurityPostureResponse)
async def metrics_posture(
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> SecurityPostureResponse:
    return SecurityPostureResponse(**AuditService().security_posture(db))
