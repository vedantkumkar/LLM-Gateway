from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Decision = Literal["ALLOW", "REDACT_AND_ALLOW", "BLOCK"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
Role = Literal["admin", "security_analyst", "developer", "employee", "auditor"]
UserStatus = Literal["active", "suspended", "invited"]
PolicyCategory = Literal["PII", "Secrets", "Prompt Injection", "DLP", "Model Access"]
PolicyAction = Literal["Allow", "Alert", "Redact", "Block", "Restrict"]
PolicySeverity = Literal["low", "medium", "high", "critical"]


class User(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str


class UserProfileResponse(User):
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    last_active: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    role: Role | None = None
    department: str | None = None
    status: UserStatus | None = None


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


class TrafficPoint(BaseModel):
    label: str
    total: int
    allowed: int
    redacted: int = 0
    blocked: int


class ThreatTrendPoint(BaseModel):
    label: str
    injection: int
    pii: int
    secrets: int


class ThreatCategoryCount(BaseModel):
    category: str
    count: int


class DecisionCount(BaseModel):
    decision: str
    value: int


class LatencyPoint(BaseModel):
    label: str
    latency: int


class AnalyticsBundleResponse(BaseModel):
    requestVolume: list[TrafficPoint]
    threatTrends: list[ThreatTrendPoint]
    piiCategories: list[ThreatCategoryCount]
    modelUsage: list[ThreatCategoryCount]
    departmentUsage: list[ThreatCategoryCount]
    blockedVsAllowed: list[DecisionCount]
    riskDistribution: list[ThreatCategoryCount]
    latencyTrend: list[LatencyPoint]


class SecurityPostureResponse(BaseModel):
    status: Literal["SECURE", "DEGRADED", "AT RISK"]
    score: int
    label: str
    controls: list[dict[str, str]]


class GatewaySettingsGeneral(BaseModel):
    organization: str
    environment: str
    defaultModel: str


class GatewaySettingsSecurity(BaseModel):
    defaultRiskThreshold: int = Field(ge=0, le=100)
    injectionThreshold: int = Field(ge=0, le=100)
    piiHandling: Literal["Redact", "Block", "Alert"]
    enableResponseScanning: bool
    enableSecretDetection: bool


class GatewaySettingsRateLimits(BaseModel):
    maxRequestsPerMinute: int = Field(ge=1, le=10000)
    burstAllowance: int = Field(ge=0, le=10000)


class GatewaySettingsAudit(BaseModel):
    retentionDays: int = Field(ge=1, le=3650)
    immutableStorage: bool = True


class GatewaySettingsNotifications(BaseModel):
    criticalEmail: bool = False
    slackAlerts: bool = False
    weeklyDigest: bool = False


class GatewaySettingsDeveloper(BaseModel):
    enableSemanticCache: bool = False
    verboseLogging: bool = False


class GatewaySettingsResponse(BaseModel):
    general: GatewaySettingsGeneral
    security: GatewaySettingsSecurity
    rateLimits: GatewaySettingsRateLimits
    audit: GatewaySettingsAudit
    notifications: GatewaySettingsNotifications
    developer: GatewaySettingsDeveloper


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: str
    category: PolicyCategory
    severity: PolicySeverity
    threshold: int
    action: PolicyAction
    applies_to: Literal["Organization", "Department", "Role", "User"]
    applies_to_value: str | None = None
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PolicyWriteRequest(BaseModel):
    name: str
    description: str = ""
    category: PolicyCategory
    severity: PolicySeverity = "medium"
    threshold: int = Field(default=0, ge=0, le=1000)
    action: PolicyAction
    applies_to: Literal["Organization", "Department", "Role", "User"] = "Organization"
    applies_to_value: str | None = None
    enabled: bool = True


class PolicyPatchRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: PolicyCategory | None = None
    severity: PolicySeverity | None = None
    threshold: int | None = Field(default=None, ge=0, le=1000)
    action: PolicyAction | None = None
    applies_to: Literal["Organization", "Department", "Role", "User"] | None = None
    applies_to_value: str | None = None
    enabled: bool | None = None


class SecurityEventResponse(BaseModel):
    id: str
    request_id: str
    timestamp: datetime
    user_email: str
    role: str
    department: str
    model: str
    decision: str
    risk_score: float
    risk_level: str
    threat_type: str
    event: str
    detections_summary: str
    sanitized_prompt: str


class NotificationResponse(BaseModel):
    id: str
    title: str
    detail: str
    severity: str
    timestamp: datetime
