from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[str] = mapped_column(String(64), index=True, unique=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    user_email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(64), index=True)
    department: Mapped[str] = mapped_column(String(128), index=True)
    model: Mapped[str] = mapped_column(String(128), index=True)
    decision: Mapped[str] = mapped_column(String(32), index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    risk_level: Mapped[str] = mapped_column(String(32), index=True)
    pii_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    secret_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    injection_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    detections_summary: Mapped[str] = mapped_column(Text, default="[]")
    sanitized_prompt: Mapped[str] = mapped_column(Text, default="")
    response_status: Mapped[str] = mapped_column(String(32), default="NOT_CALLED")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=True)

