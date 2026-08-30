import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Select, case, func, or_, select
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
        summary = db.execute(
            select(
                func.count(AuditLog.id),
                func.sum(case((AuditLog.decision == "ALLOW", 1), else_=0)),
                func.sum(case((AuditLog.decision == "REDACT_AND_ALLOW", 1), else_=0)),
                func.sum(case((AuditLog.decision == "BLOCK", 1), else_=0)),
                func.sum(case((AuditLog.pii_detected.is_(True), 1), else_=0)),
                func.sum(case((AuditLog.secret_detected.is_(True), 1), else_=0)),
                func.sum(case((AuditLog.injection_detected.is_(True), 1), else_=0)),
                func.avg(AuditLog.risk_score),
                func.avg(AuditLog.latency_ms),
            )
        ).one()
        total = summary[0] or 0
        allowed = summary[1] or 0
        redacted = summary[2] or 0
        blocked = summary[3] or 0
        pii = summary[4] or 0
        secrets = summary[5] or 0
        injection = summary[6] or 0
        avg_risk = summary[7] or 0
        avg_latency = summary[8] or 0
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

    def security_events(self, db: Session, *, user: User, limit: int = 50, read_all: bool = False) -> list[dict[str, Any]]:
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
        if not read_all:
            stmt = stmt.where(AuditLog.user_id == user.id)
        return [self._security_event(record) for record in db.scalars(stmt).all()]

    def analytics(self, db: Session, range_name: str = "24h") -> dict[str, Any]:
        buckets = self._buckets(range_name)
        start = buckets[0]["start"] if buckets else datetime.now(timezone.utc)
        rows = list(db.scalars(select(AuditLog).where(AuditLog.timestamp >= start).order_by(AuditLog.timestamp.asc())).all())
        labels = [bucket["label"] for bucket in buckets]
        traffic = {
            label: {"label": label, "total": 0, "allowed": 0, "redacted": 0, "blocked": 0}
            for label in labels
        }
        trends = {label: {"label": label, "injection": 0, "pii": 0, "secrets": 0} for label in labels}
        latency = {label: [] for label in labels}
        pii_categories: Counter[str] = Counter()
        models: Counter[str] = Counter()
        departments: Counter[str] = Counter()
        decisions: Counter[str] = Counter()
        risks: Counter[str] = Counter({"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0})

        for row in rows:
            label = self._bucket_label(row.timestamp, buckets)
            if label is None:
                continue
            traffic[label]["total"] += 1
            if row.decision == "ALLOW":
                traffic[label]["allowed"] += 1
            elif row.decision == "REDACT_AND_ALLOW":
                traffic[label]["redacted"] += 1
            elif row.decision == "BLOCK":
                traffic[label]["blocked"] += 1
            if row.injection_detected:
                trends[label]["injection"] += 1
            if row.pii_detected:
                trends[label]["pii"] += 1
            if row.secret_detected:
                trends[label]["secrets"] += 1
            latency[label].append(row.latency_ms)
            models[row.model] += 1
            departments[row.department] += 1
            decisions[row.decision] += 1
            risks[row.risk_level] += 1
            for detection in self._detections(row.detections_summary):
                if detection.get("category") == "PII":
                    pii_categories[str(detection.get("type", "Unknown"))] += 1

        return {
            "requestVolume": list(traffic.values()),
            "threatTrends": list(trends.values()),
            "piiCategories": [{"category": key, "count": value} for key, value in sorted(pii_categories.items())],
            "modelUsage": [{"category": key, "count": value} for key, value in sorted(models.items())],
            "departmentUsage": [{"category": key, "count": value} for key, value in sorted(departments.items())],
            "blockedVsAllowed": [
                {"decision": "Allowed", "value": decisions["ALLOW"]},
                {"decision": "Redacted", "value": decisions["REDACT_AND_ALLOW"]},
                {"decision": "Blocked", "value": decisions["BLOCK"]},
            ],
            "riskDistribution": [
                {"category": key.title(), "count": risks[key]}
                for key in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            ],
            "latencyTrend": [
                {
                    "label": label,
                    "latency": round(sum(values) / len(values)) if values else 0,
                }
                for label, values in latency.items()
            ],
        }

    def security_posture(self, db: Session) -> dict[str, Any]:
        posture = db.execute(
            select(
                func.count(AuditLog.id),
                func.sum(case((AuditLog.risk_level == "CRITICAL", 1), else_=0)),
                func.sum(case((AuditLog.risk_level == "HIGH", 1), else_=0)),
                func.sum(case((AuditLog.decision == "BLOCK", 1), else_=0)),
            )
        ).one()
        total = posture[0] or 0
        critical = posture[1] or 0
        high = posture[2] or 0
        blocked = posture[3] or 0
        if total == 0:
            score = 100
        else:
            score = max(0, 100 - round(((critical * 8) + (high * 4) + (blocked * 2)) / total))
        status = "SECURE" if score >= 80 else "DEGRADED" if score >= 55 else "AT RISK"
        return {
            "status": status,
            "score": score,
            "label": "Derived from audit history",
            "controls": [
                {"name": "Authentication", "state": "Active"},
                {"name": "Policy Engine", "state": "Active"},
                {"name": "Audit Logging", "state": "Active"},
                {"name": "Response Scanning", "state": "Active"},
            ],
        }

    @staticmethod
    def _detections(summary: str) -> list[dict[str, Any]]:
        try:
            parsed = json.loads(summary)
        except (TypeError, ValueError):
            return []
        return [item for item in parsed if isinstance(item, dict)] if isinstance(parsed, list) else []

    @staticmethod
    def _buckets(range_name: str) -> list[dict[str, datetime | str]]:
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        if range_name == "24h":
            starts = [now - timedelta(hours=23 - index) for index in range(24)]
            return [{"label": start.strftime("%H:00"), "start": start, "end": start + timedelta(hours=1)} for start in starts]
        if range_name == "90d":
            today = now.replace(hour=0)
            starts = [today - timedelta(days=7 * (12 - index)) for index in range(13)]
            return [{"label": start.strftime("%Y-%m-%d"), "start": start, "end": start + timedelta(days=7)} for start in starts]
        days = 7 if range_name == "7d" else 30
        today = now.replace(hour=0)
        starts = [today - timedelta(days=days - 1 - index) for index in range(days)]
        return [{"label": start.strftime("%Y-%m-%d"), "start": start, "end": start + timedelta(days=1)} for start in starts]

    @staticmethod
    def _bucket_label(timestamp: datetime, buckets: list[dict[str, datetime | str]]) -> str | None:
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        for bucket in buckets:
            start = bucket["start"]
            end = bucket["end"]
            if isinstance(start, datetime) and isinstance(end, datetime) and start <= timestamp < end:
                label = bucket["label"]
                return label if isinstance(label, str) else None
        return None

    def _security_event(self, record: AuditLog) -> dict[str, Any]:
        threat_type = self._threat_type(record)
        return {
            "id": str(record.id),
            "request_id": record.request_id,
            "timestamp": record.timestamp,
            "user_email": record.user_email,
            "role": record.role,
            "department": record.department,
            "model": record.model,
            "decision": record.decision,
            "risk_score": record.risk_score,
            "risk_level": record.risk_level,
            "threat_type": threat_type,
            "event": f"{threat_type} detected",
            "detections_summary": record.detections_summary,
            "sanitized_prompt": record.sanitized_prompt,
        }

    @staticmethod
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
