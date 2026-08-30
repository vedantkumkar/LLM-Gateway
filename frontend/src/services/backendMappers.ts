import { mockModels, mockPolicies, mockRolePermissions } from "@/data/mockData";
import { buildPipelineResult } from "./mockSecurityEngine";
import type {
  AIModel,
  AuditLog,
  DashboardMetrics,
  DecisionBreakdown,
  Department,
  DirectoryUser,
  GatewayRequest,
  GatewayResponse,
  PipelineStageResult,
  Policy,
  RiskBreakdown,
  SecurityDetection,
  SecurityEvent,
  Severity,
  SystemHealth,
  ThreatCategory,
  ThreatType,
  UserRole,
} from "@/types";

export interface BackendDetection {
  type: string;
  category: string;
  confidence: number;
  start?: number | null;
  end?: number | null;
}

export interface BackendInjectionAnalysis {
  score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  matched_indicators: string[];
  reason: string;
}

export interface BackendGatewayResponse {
  request_id: string;
  decision: "ALLOW" | "REDACT_AND_ALLOW" | "BLOCK";
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detections: BackendDetection[];
  injection_analysis: BackendInjectionAnalysis;
  sanitized_prompt: string;
  policy_reasons: string[];
  processing_time_ms: number;
  response?: string | null;
  response_scan_status?: string;
  llm_provider?: string;
}

export interface BackendMetrics {
  total_requests: number;
  allowed_requests: number;
  redacted_requests: number;
  blocked_requests: number;
  pii_detections: number;
  secret_detections: number;
  prompt_injection_attempts: number;
  average_risk_score: number;
  average_latency_ms: number;
  recent_security_events: BackendRecentEvent[];
}

export interface BackendRecentEvent {
  request_id: string;
  timestamp: string;
  user_email: string;
  decision: "ALLOW" | "REDACT_AND_ALLOW" | "BLOCK";
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  model: string;
}

export interface BackendAuditRecord {
  id: number;
  request_id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  role: string;
  department: string;
  model: string;
  decision: "ALLOW" | "REDACT_AND_ALLOW" | "BLOCK";
  risk_score: number;
  risk_level: string;
  pii_detected: boolean;
  secret_detected: boolean;
  injection_detected: boolean;
  detections_summary: string;
  sanitized_prompt: string;
  response_status: string;
  latency_ms: number;
  success: boolean;
}

export interface BackendModel {
  id: string;
  provider: string;
  enabled: boolean;
  allowed_roles: string[];
  can_access: boolean;
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status?: "active" | "suspended" | "invited";
  created_at?: string;
  updated_at?: string;
  last_active?: string | null;
}

export interface BackendPolicy {
  id: string;
  name: string;
  description: string;
  category: Policy["category"];
  severity: Severity;
  threshold: number;
  action: Policy["action"];
  applies_to: Policy["appliesTo"];
  applies_to_value?: string | null;
  enabled: boolean;
  updated_at: string;
}

export interface BackendHealth {
  status: string;
  gateway: string;
  database: string;
  rate_limiter: string;
  llm_provider: string;
}

export interface BackendSecurityEvent {
  id: string;
  request_id: string;
  timestamp: string;
  user_email: string;
  role: string;
  department: string;
  model: string;
  decision: "ALLOW" | "REDACT_AND_ALLOW" | "BLOCK";
  risk_score: number;
  risk_level: string;
  threat_type: ThreatType;
  event: string;
  detections_summary: string;
  sanitized_prompt: string;
}

export interface BackendNotification {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  timestamp: string;
}

const roleMap: Record<string, UserRole> = {
  admin: "Admin",
  security_analyst: "Security Analyst",
  developer: "Developer",
  employee: "Employee",
  auditor: "Auditor",
};

const departmentMap: Record<string, Department> = {
  Engineering: "Engineering",
  Security: "Security",
  Finance: "Finance",
  "Human Resources": "Human Resources",
  Legal: "Legal",
  Operations: "Operations",
};

const modelNames: Record<string, string> = {
  "internal-secure-llm": "Internal Secure LLM",
  "mock-secure-llm": "Mock Secure LLM",
  "gpt-enterprise-demo": "GPT Enterprise Demo",
  "claude-enterprise-demo": "Claude Enterprise Demo",
};

export const modelToBackendId: Record<string, string> = {
  "Internal Secure LLM": "internal-secure-llm",
  "Mock Secure LLM": "mock-secure-llm",
  "GPT Enterprise": "gpt-enterprise-demo",
  "GPT Enterprise Demo": "gpt-enterprise-demo",
  "Claude Enterprise": "claude-enterprise-demo",
  "Claude Enterprise Demo": "claude-enterprise-demo",
};

function toRole(role: string): UserRole {
  return roleMap[role] ?? (role as UserRole);
}

function toDepartment(department: string): Department {
  return departmentMap[department] ?? "Operations";
}

function severityFromRisk(score: number): Severity {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function threatFromAudit(record: BackendAuditRecord): ThreatType {
  if (record.injection_detected) return "Prompt Injection";
  if (record.secret_detected) return "Secret Detection";
  if (record.pii_detected) return "PII Exposure";
  if (record.decision === "BLOCK") return "Policy Violation";
  return "Safe Prompt";
}

export function parseBackendTimestamp(timestamp: string) {
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  return new Date(hasTimezone ? timestamp : `${timestamp}Z`);
}

function formatBackendTimestamp(timestamp: string) {
  return parseBackendTimestamp(timestamp).toLocaleString();
}

function relativeTime(timestamp: string) {
  const diffMs = Date.now() - parseBackendTimestamp(timestamp).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function backendModelId(model: string) {
  return modelToBackendId[model] ?? model;
}

export function mapDetections(detections: BackendDetection[]): SecurityDetection[] {
  return detections.map((detection) => ({
    type: detection.type,
    value: `<${detection.type}>`,
    confidence: Math.round(detection.confidence * 100),
  }));
}

export function mapGatewayResponse(
  req: GatewayRequest,
  backend: BackendGatewayResponse,
  analyzeOnly: boolean,
): GatewayResponse {
  const detections = mapDetections(backend.detections);
  const hasPii = backend.detections.some((d) => d.category === "PII");
  const hasSecret = backend.detections.some((d) => d.category === "SECRET");
  const riskBreakdown: RiskBreakdown = {
    piiRisk: hasPii
      ? Math.min(80, 25 * backend.detections.filter((d) => d.category === "PII").length)
      : 0,
    injectionRisk: backend.injection_analysis.score,
    secretRisk: hasSecret ? 100 : 0,
    policyRisk:
      backend.decision === "BLOCK" ? 90 : backend.decision === "REDACT_AND_ALLOW" ? 40 : 0,
  };
  const analysis = {
    detections,
    sanitizedPrompt: backend.sanitized_prompt,
    riskBreakdown,
    riskScore: backend.risk_score,
    riskLevel: backend.risk_level,
    decision: backend.decision,
    policyTriggered: backend.policy_reasons.join("; ") || "None",
    injectionMatched: backend.injection_analysis.matched_indicators,
  };
  const pipeline = buildPipelineResult(analysis, analyzeOnly).map((stage): PipelineStageResult => {
    if (stage.name === "LLM Request" && backend.llm_provider) {
      return { ...stage, detail: `${stage.detail ?? "Provider"} · ${backend.llm_provider}` };
    }
    if (stage.name === "Response Scan" && backend.response_scan_status) {
      return { ...stage, detail: backend.response_scan_status };
    }
    return stage;
  });

  return {
    requestId: backend.request_id,
    decision: backend.decision,
    riskScore: backend.risk_score,
    riskLevel: backend.risk_level,
    riskBreakdown,
    detections,
    originalPrompt: req.prompt,
    sanitizedPrompt: backend.sanitized_prompt,
    policyTriggered: analysis.policyTriggered,
    processingTimeMs: backend.processing_time_ms,
    pipeline,
    llmResponse: backend.response ?? undefined,
    responseScan: backend.response_scan_status,
    blockedReason:
      backend.decision === "BLOCK"
        ? backend.policy_reasons.join("; ") || backend.response || "Request blocked."
        : undefined,
  };
}

export function mapMetrics(metrics: BackendMetrics): DashboardMetrics {
  return {
    totalRequests: metrics.total_requests,
    totalRequestsTrend: 0,
    allowedRequests: metrics.allowed_requests,
    allowedTrend: 0,
    redactedRequests: metrics.redacted_requests,
    redactedTrend: 0,
    blockedThreats: metrics.blocked_requests,
    blockedTrend: 0,
    piiDetections: metrics.pii_detections,
    piiTrend: 0,
    injectionAttempts: metrics.prompt_injection_attempts,
    injectionTrend: 0,
    averageRiskScore: Math.round(metrics.average_risk_score),
    riskTrend: 0,
    gatewayLatencyMs: Math.round(metrics.average_latency_ms),
    latencyTrend: 0,
  };
}

function parseDetections(summary: string): string[] {
  try {
    const parsed = JSON.parse(summary) as BackendDetection[];
    return parsed.map((item) => item.type);
  } catch {
    return [];
  }
}

export function mapAudit(record: BackendAuditRecord): AuditLog {
  const detections = parseDetections(record.detections_summary);
  return {
    requestId: record.request_id,
    timestamp: formatBackendTimestamp(record.timestamp),
    user: record.user_email,
    department: toDepartment(record.department),
    role: toRole(record.role),
    model: modelNames[record.model] ?? record.model,
    decision: record.decision,
    riskScore: Math.round(record.risk_score),
    detections,
    latencyMs: record.latency_ms,
    status: record.decision === "BLOCK" ? "Blocked" : record.success ? "Success" : "Error",
    authStatus: "Authenticated bearer token",
    policyResult: record.decision,
    sanitizedPrompt: record.sanitized_prompt,
    llmStatus:
      record.response_status === "NOT_CALLED" ? "Provider not called" : record.response_status,
    responseScan: record.response_status,
    securityChecks: [
      { name: "Authentication", result: "Pass" },
      { name: "RBAC", result: "Pass" },
      { name: "PII Detection", result: record.pii_detected ? "Detected" : "Pass" },
      { name: "Secret Detection", result: record.secret_detected ? "Detected" : "Pass" },
      { name: "Prompt Injection", result: record.injection_detected ? "Detected" : "Pass" },
      { name: "Policy Engine", result: record.decision },
    ],
  };
}

export function auditToEvent(record: BackendAuditRecord): SecurityEvent {
  const audit = mapAudit(record);
  const threatType = threatFromAudit(record);
  return {
    id: String(record.id),
    timestamp: audit.timestamp,
    relativeTime: relativeTime(record.timestamp),
    severity: severityFromRisk(record.risk_score),
    threatType,
    event: threatType === "Safe Prompt" ? "Prompt allowed by gateway" : `${threatType} detected`,
    user: audit.user,
    role: audit.role,
    department: audit.department,
    sourceIp: "Server audit",
    model: audit.model,
    riskScore: audit.riskScore,
    decision: audit.decision,
    policyTriggered: audit.policyResult,
    requestId: audit.requestId,
    detections: audit.detections.map((type) => ({ type, value: `<${type}>`, confidence: 100 })),
    sanitizedPrompt: audit.sanitizedPrompt,
    pipeline: [
      { name: "Authentication", state: "passed", detail: "Bearer token accepted" },
      { name: "RBAC", state: "passed", detail: "Model access evaluated" },
      { name: "Rate Limit", state: "passed", detail: "Within configured limit" },
      {
        name: "Sensitive Data Scan",
        state: record.pii_detected || record.secret_detected ? "warning" : "passed",
        detail: audit.detections.length
          ? audit.detections.join(", ")
          : "No sensitive data detected",
      },
      {
        name: "Prompt Injection Scan",
        state: record.injection_detected ? "blocked" : "passed",
      },
      {
        name: "Policy Engine",
        state:
          record.decision === "BLOCK"
            ? "blocked"
            : record.decision === "REDACT_AND_ALLOW"
              ? "warning"
              : "passed",
        detail: record.decision,
      },
      { name: "LLM Request", state: record.decision === "BLOCK" ? "waiting" : "passed" },
      {
        name: "Response Scan",
        state: record.response_status === "REDACTED" ? "warning" : "passed",
      },
      { name: "Audit Log", state: "passed", detail: "Persisted" },
    ],
  };
}

export function mapModel(model: BackendModel): AIModel {
  const existing = mockModels.find((m) => m.id === model.id || m.name === modelNames[model.id]);
  return {
    ...(existing ?? mockModels[0]!),
    id: model.id,
    name: modelNames[model.id] ?? model.id,
    provider: model.provider,
    type: model.id.includes("internal") || model.id.includes("mock") ? "Internal" : "External",
    status: !model.enabled ? "Disabled" : model.can_access ? "Available" : "Restricted",
    permittedDepartments: existing?.permittedDepartments ?? [
      "Engineering",
      "Security",
      "Operations",
    ],
    notes: model.can_access
      ? "Accessible for current demo role."
      : "Restricted for current demo role.",
  };
}

export function mapUser(user: BackendUser): DirectoryUser {
  const role = toRole(user.role);
  return {
    id: user.id,
    username: user.email.split("@")[0] ?? user.email,
    name: user.name,
    email: user.email,
    department: toDepartment(user.department),
    role,
    modelAccess:
      role === "Admin" || role === "Security Analyst" ? "All demo models" : "Permitted demo models",
    status:
      user.status === "suspended" ? "Suspended" : user.status === "invited" ? "Invited" : "Active",
    lastActive: user.last_active ? formatBackendTimestamp(user.last_active) : "Not recorded",
  };
}

export function mapPolicy(policy: BackendPolicy): Policy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    category: policy.category,
    severity: policy.severity,
    threshold: policy.threshold,
    action: policy.action,
    appliesTo: policy.applies_to,
    appliesToValue: policy.applies_to_value ?? undefined,
    enabled: policy.enabled,
    updatedAt: formatBackendTimestamp(policy.updated_at),
  };
}

export function eventFromBackend(event: BackendSecurityEvent): SecurityEvent {
  const detections = parseDetections(event.detections_summary);
  return {
    id: event.id,
    timestamp: formatBackendTimestamp(event.timestamp),
    relativeTime: relativeTime(event.timestamp),
    severity: severityFromRisk(event.risk_score),
    threatType: event.threat_type,
    event: event.event,
    user: event.user_email,
    role: toRole(event.role),
    department: toDepartment(event.department),
    sourceIp: "Server audit",
    model: modelNames[event.model] ?? event.model,
    riskScore: Math.round(event.risk_score),
    decision: event.decision,
    policyTriggered: event.decision,
    requestId: event.request_id,
    detections: detections.map((type) => ({ type, value: `<${type}>`, confidence: 100 })),
    sanitizedPrompt: event.sanitized_prompt,
    pipeline: auditToEvent({
      id: Number(event.id) || 0,
      request_id: event.request_id,
      timestamp: event.timestamp,
      user_id: "",
      user_email: event.user_email,
      role: event.role,
      department: event.department,
      model: event.model,
      decision: event.decision,
      risk_score: event.risk_score,
      risk_level: event.risk_level,
      pii_detected: detections.includes("EMAIL_ADDRESS") || detections.includes("PHONE_NUMBER"),
      secret_detected: detections.some((type) => type.includes("KEY") || type.includes("SECRET")),
      injection_detected: event.threat_type === "Prompt Injection",
      detections_summary: event.detections_summary,
      sanitized_prompt: event.sanitized_prompt,
      response_status: event.decision === "BLOCK" ? "BLOCKED" : "SAFE",
      latency_ms: 0,
      success: true,
    }).pipeline,
  };
}

export function notificationFromBackend(notification: BackendNotification) {
  return {
    id: notification.id,
    title: notification.title,
    detail: notification.detail,
    severity: notification.severity,
    time: relativeTime(notification.timestamp),
  };
}

export function mapHealth(health: BackendHealth, metrics?: DashboardMetrics): SystemHealth {
  const gatewayHealthy = health.status === "healthy";
  return {
    services: [
      {
        name: "Gateway API",
        status: gatewayHealthy ? "Healthy" : "Degraded",
        detail: `Real backend status: ${health.gateway}`,
      },
      {
        name: "Policy Engine",
        status: "Operational",
        detail: "Real backend policy engine configuration",
      },
      {
        name: "PII Detection Engine",
        status: "Operational",
        detail: "Real backend detector with regex fallback",
      },
      {
        name: "Prompt Defense Engine",
        status: "Operational",
        detail: "Real backend heuristic detector",
      },
      {
        name: "Audit Database",
        status: health.database === "connected" ? "Connected" : "Degraded",
        detail: `Real backend database: ${health.database}`,
      },
      {
        name: "Redis Rate Limiter",
        status: health.rate_limiter === "operational" ? "Operational" : "Degraded",
        detail: `Real backend limiter status: ${health.rate_limiter}`,
      },
      {
        name: "LLM Provider",
        status: "Operational",
        detail: `Real backend provider mode: ${health.llm_provider}`,
      },
    ],
    uptime: "Live backend health checked",
    requestsPerMinute: 0,
    averageLatencyMs: metrics?.gatewayLatencyMs ?? 0,
    errorRate: gatewayHealthy ? 0 : 1,
    activeConnections: 1,
    databaseLatencyMs: 1,
    cacheHitRate: 0,
    instances: [
      {
        name: "local-gateway-1",
        status: gatewayHealthy ? "Healthy" : "Degraded",
        region: "Simulated local replica",
        load: 18,
      },
    ],
    throughput: [
      { label: "Now", rpm: 0, latency: metrics?.gatewayLatencyMs ?? 0 },
      { label: "Current", rpm: 0, latency: metrics?.gatewayLatencyMs ?? 0 },
    ],
  };
}

export function backendRolePermissions(permissions: Record<string, string[]>) {
  return mockRolePermissions.map((role) => {
    const backendRole = Object.entries(roleMap).find(([, label]) => label === role.role)?.[0];
    const allowed = new Set(backendRole ? (permissions[backendRole] ?? []) : []);
    return {
      ...role,
      permissions: Object.fromEntries(
        Object.keys(role.permissions).map((key) => [key, allowed.has(key) || allowed.has("*")]),
      ),
    };
  });
}
