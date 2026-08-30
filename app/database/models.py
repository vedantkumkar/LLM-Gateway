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


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(64), index=True, default="employee")
    department: Mapped[str] = mapped_column(String(128), index=True, default="Operations")
    status: Mapped[str] = mapped_column(String(32), index=True, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_active: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PolicyRecord(Base):
    __tablename__ = "policy_records"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(32), default="medium")
    threshold: Mapped[int] = mapped_column(Integer, default=0)
    action: Mapped[str] = mapped_column(String(32), default="Block")
    applies_to: Mapped[str] = mapped_column(String(32), default="Organization")
    applies_to_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class GatewaySettingsRecord(Base):
    __tablename__ = "gateway_settings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default="default")
    organization: Mapped[str] = mapped_column(String(255), default="SentinelAI")
    environment: Mapped[str] = mapped_column(String(64), default="production")
    default_model: Mapped[str] = mapped_column(String(128), default="gemini-2.5-flash")
    default_risk_threshold: Mapped[int] = mapped_column(Integer, default=70)
    injection_threshold: Mapped[int] = mapped_column(Integer, default=70)
    pii_handling: Mapped[str] = mapped_column(String(32), default="Redact")
    enable_response_scanning: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_secret_detection: Mapped[bool] = mapped_column(Boolean, default=True)
    max_requests_per_minute: Mapped[int] = mapped_column(Integer, default=60)
    burst_allowance: Mapped[int] = mapped_column(Integer, default=0)
    audit_retention_days: Mapped[int] = mapped_column(Integer, default=90)
    critical_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


DEFAULT_POLICIES: list[dict[str, object]] = [
    {
        "id": "policy-pii",
        "name": "PII Handling",
        "description": "Detect and redact personally identifiable information before provider processing.",
        "category": "PII",
        "severity": "medium",
        "threshold": 50,
        "action": "Redact",
    },
    {
        "id": "policy-secrets",
        "name": "Secret Detection",
        "description": "Block prompts containing API keys, tokens, or credential-like secrets.",
        "category": "Secrets",
        "severity": "critical",
        "threshold": 1,
        "action": "Block",
    },
    {
        "id": "policy-injection",
        "name": "Prompt Injection",
        "description": "Block prompts that exceed the prompt injection risk threshold.",
        "category": "Prompt Injection",
        "severity": "critical",
        "threshold": 70,
        "action": "Block",
    },
    {
        "id": "policy-dlp",
        "name": "Restricted Enterprise Data DLP",
        "description": "Block disclosure or exfiltration requests for restricted enterprise data.",
        "category": "DLP",
        "severity": "critical",
        "threshold": 1,
        "action": "Block",
    },
    {
        "id": "policy-model-access",
        "name": "Model Access",
        "description": "Enforce server-side model access by role.",
        "category": "Model Access",
        "severity": "high",
        "threshold": 1,
        "action": "Restrict",
    },
]
