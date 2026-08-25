from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.rbac import require_permission
from app.database.database import get_db
from app.schemas.schemas import MetricsSummary, User
from app.services.audit_service import AuditService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
async def metrics_summary(
    _: User = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> MetricsSummary:
    return MetricsSummary(**AuditService().metrics(db))

