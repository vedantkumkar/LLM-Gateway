from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.rbac import require_permission
from app.database.database import get_db
from app.schemas.schemas import AnalyticsBundleResponse, MetricsSummary, SecurityPostureResponse, TrafficPoint, User
from app.services.audit_service import AuditService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
async def metrics_summary(
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> MetricsSummary:
    return MetricsSummary(**AuditService().metrics(db))


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
