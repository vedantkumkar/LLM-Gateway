from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.authentication import get_current_user
from app.auth.rbac import has_permission
from app.database.database import get_db
from app.schemas.schemas import AuditRecord, User
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditRecord])
async def list_audit_records(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    decision: str | None = None,
    risk_level: str | None = None,
    user: str | None = None,
    model: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditRecord]:
    read_all = has_permission(current_user, "audit:read_all")
    service = AuditService()
    return service.query_events(
        db,
        user=current_user,
        limit=limit,
        offset=offset,
        decision=decision,
        risk_level=risk_level,
        user_filter=user,
        model=model,
        read_all=read_all,
    )

