import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth.authentication import get_current_user
from app.auth.rbac import has_permission
from app.database.database import get_db
from app.database.models import AuditLog
from app.schemas.schemas import NotificationResponse, SecurityEventResponse, User

router = APIRouter(tags=["security"])


def _query_visible_security_audits(db: Session, user: User, limit: int) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .where(
            or_(
                AuditLog.decision.in_(["BLOCK", "REDACT_AND_ALLOW"]),
                AuditLog.risk_level.in_(["HIGH", "CRITICAL"]),
            )
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    if not has_permission(user, "audit:read_all"):
        stmt = stmt.where(AuditLog.user_id == user.id)
    return list(db.scalars(stmt).all())


def _threat_type(record: AuditLog) -> str:
    if record.injection_detected:
        return "Prompt Injection"
    if record.secret_detected:
        return "Secret Detection"
    if "Restricted or sensitive enterprise data" in record.detections_summary or record.decision == "BLOCK":
        return "Policy Violation"
    if record.pii_detected:
        return "PII Exposure"
    return "Suspicious Activity"


@router.get("/security/events", response_model=list[SecurityEventResponse])
async def list_security_events(
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SecurityEventResponse]:
    records = _query_visible_security_audits(db, user, limit)
    return [
        SecurityEventResponse(
            id=str(record.id),
            request_id=record.request_id,
            timestamp=record.timestamp,
            user_email=record.user_email,
            role=record.role,
            department=record.department,
            model=record.model,
            decision=record.decision,
            risk_score=record.risk_score,
            risk_level=record.risk_level,
            threat_type=_threat_type(record),
            event=f"{_threat_type(record)} detected",
            detections_summary=record.detections_summary,
            sanitized_prompt=record.sanitized_prompt,
        )
        for record in records
    ]


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NotificationResponse]:
    records = _query_visible_security_audits(db, user, limit)
    notifications: list[NotificationResponse] = []
    for record in records:
        severity = "critical" if record.risk_level == "CRITICAL" else "high" if record.risk_level == "HIGH" else "medium"
        detections = []
        try:
            detections = [item.get("type", "") for item in json.loads(record.detections_summary)]
        except (TypeError, ValueError, AttributeError):
            detections = []
        detail = ", ".join(item for item in detections if item) or record.decision
        notifications.append(
            NotificationResponse(
                id=f"notification-{record.request_id}",
                title=f"{_threat_type(record)} {record.decision.lower()}",
                detail=detail,
                severity=severity,
                timestamp=record.timestamp,
            )
        )
    return notifications
