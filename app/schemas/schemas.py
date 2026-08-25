from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Decision = Literal["ALLOW", "REDACT_AND_ALLOW", "BLOCK"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class User(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=20000)
    model: str = "internal-secure-llm"


class Detection(BaseModel):
    type: str
    category: str
    confidence: float
    start: int | None = None
    end: int | None = None


class InjectionAnalysis(BaseModel):
    score: int
    risk_level: RiskLevel
    matched_indicators: list[str]
    reason: str


class RiskSummary(BaseModel):
    overall_score: int
    risk_level: RiskLevel
    pii_score: int
    injection_score: int
    secret_score: int
    policy_score: int
    explanation: list[str]


class AnalyzeResponse(BaseModel):
    request_id: str
    decision: Decision
    risk_score: int
    risk_level: RiskLevel
    detections: list[Detection]
    injection_analysis: InjectionAnalysis
    sanitized_prompt: str
    policy_reasons: list[str]
    processing_time_ms: int


class ChatResponse(AnalyzeResponse):
    response: str | None = None
    response_scan_status: str
    llm_provider: str


class HealthResponse(BaseModel):
    status: str
    gateway: str
    database: str
    rate_limiter: str
    llm_provider: str


class AuditRecord(BaseModel):
    id: int
    request_id: str
    timestamp: datetime
    user_id: str
    user_email: str
    role: str
    department: str
    model: str
    decision: str
    risk_score: float
    risk_level: str
    pii_detected: bool
    secret_detected: bool
    injection_detected: bool
    detections_summary: str
    sanitized_prompt: str
    response_status: str
    latency_ms: int
    success: bool

    model_config = {"from_attributes": True}


class MetricsSummary(BaseModel):
    total_requests: int
    allowed_requests: int
    redacted_requests: int
    blocked_requests: int
    pii_detections: int
    secret_detections: int
    prompt_injection_attempts: int
    average_risk_score: float
    average_latency_ms: float
    recent_security_events: list[dict[str, Any]]

