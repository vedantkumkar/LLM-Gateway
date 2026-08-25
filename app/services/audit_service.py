import json
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.database.models import AuditLog
from app.schemas.schemas import Detection, User


class AuditService:
    def create_event(
        self,
        db: Session,
        *,
        request_id: str,
        user: User,
        model: str,
        decision: str,
        risk_score: int,
        risk_level: str,
        detections: list[Detection],
        sanitized_prompt: str,
        response_status: str,
        latency_ms: int,
        success: bool,
        injection_detected: bool = False,
    ) -> AuditLog:
        event = AuditLog(
            request_id=request_id,
            user_id=user.id,
            user_email=user.email,
            role=user.role,
            department=user.department,
            model=model,
            decision=decision,
            risk_score=risk_score,
            risk_level=risk_level,
            pii_detected=any(item.category == "PII" for item in detections),
            secret_detected=any(item.category == "SECRET" for item in detections),
            injection_detected=injection_detected,
            detections_summary=json.dumps([item.model_dump() for item in detections]),
            sanitized_prompt=sanitized_prompt,
            response_status=response_status,
            latency_ms=latency_ms,
            success=success,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def query_events(
        self,
        db: Session,
        *,
        user: User,
        limit: int = 50,
        offset: int = 0,
        decision: str | None = None,
        risk_level: str | None = None,
        user_filter: str | None = None,
        model: str | None = None,
        read_all: bool = False,
    ) -> list[AuditLog]:
        stmt: Select[tuple[AuditLog]] = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
        if not read_all:
            stmt = stmt.where(AuditLog.user_id == user.id)
        if decision:
            stmt = stmt.where(AuditLog.decision == decision)
        if risk_level:
            stmt = stmt.where(AuditLog.risk_level == risk_level)
        if user_filter:
            stmt = stmt.where((AuditLog.user_id == user_filter) | (AuditLog.user_email == user_filter))
        if model:
            stmt = stmt.where(AuditLog.model == model)
        return list(db.scalars(stmt).all())

    def metrics(self, db: Session) -> dict[str, Any]:
        total = db.scalar(select(func.count(AuditLog.id))) or 0
        allowed = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.decision == "ALLOW")) or 0
        redacted = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.decision == "REDACT_AND_ALLOW")) or 0
        blocked = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.decision == "BLOCK")) or 0
        pii = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.pii_detected.is_(True))) or 0
        secrets = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.secret_detected.is_(True))) or 0
        injection = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.injection_detected.is_(True))) or 0
        avg_risk = db.scalar(select(func.avg(AuditLog.risk_score))) or 0
        avg_latency = db.scalar(select(func.avg(AuditLog.latency_ms))) or 0
        recent = db.scalars(
            select(AuditLog)
            .where((AuditLog.decision == "BLOCK") | (AuditLog.risk_level.in_(["HIGH", "CRITICAL"])))
            .order_by(AuditLog.timestamp.desc())
            .limit(10)
        ).all()
        return {
            "total_requests": total,
            "allowed_requests": allowed,
            "redacted_requests": redacted,
            "blocked_requests": blocked,
            "pii_detections": pii,
            "secret_detections": secrets,
            "prompt_injection_attempts": injection,
            "average_risk_score": round(float(avg_risk), 2),
            "average_latency_ms": round(float(avg_latency), 2),
            "recent_security_events": [
                {
                    "request_id": item.request_id,
                    "timestamp": item.timestamp.isoformat(),
                    "user_email": item.user_email,
                    "decision": item.decision,
                    "risk_level": item.risk_level,
                    "model": item.model,
                }
                for item in recent
            ],
        }
