export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DecisionType = "ALLOW" | "REDACT_AND_ALLOW" | "BLOCK";
export type Severity = "low" | "medium" | "high" | "critical";
export type UserRole = "Admin" | "Security Analyst" | "Developer" | "Employee" | "Auditor";
export type Department =
  | "Engineering"
  | "Security"
  | "Finance"
  | "Human Resources"
  | "Legal"
  | "Operations";

export type ThreatType =
  | "Prompt Injection"
  | "PII Exposure"
  | "PHI Exposure"
  | "Secret Detection"
  | "Policy Violation"
  | "Unauthorized Model"
  | "Rate Limit"
  | "Suspicious Activity"
  | "Safe Prompt";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  token?: string;
}

export interface DashboardMetrics {
  totalRequests: number;
  totalRequestsTrend: number;
  allowedRequests: number;
  allowedTrend: number;
  redactedRequests: number;
  redactedTrend: number;
  blockedThreats: number;
  blockedTrend: number;
  piiDetections: number;
  piiTrend: number;
  injectionAttempts: number;
  injectionTrend: number;
  averageRiskScore: number;
  riskTrend: number;
  gatewayLatencyMs: number;
  latencyTrend: number;
}

export interface SecurityPosture {
  status: "SECURE" | "DEGRADED" | "AT RISK";
  score: number;
  label: string;
  controls: { name: string; state: "Active" | "Degraded" | "Disabled" }[];
}

export interface TrafficPoint {
  label: string;
  total: number;
  allowed: number;
  blocked: number;
}

export interface DecisionBreakdown {
  decision: string;
  value: number;
}

export interface ThreatCategory {
  category: string;
  count: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  relativeTime: string;
  severity: Severity;
  threatType: ThreatType;
  event: string;
  user: string;
  role: UserRole;
  department: Department;
  sourceIp: string;
  model: string;
  riskScore: number;
  decision: DecisionType;
  policyTriggered: string;
  requestId: string;
  detections: SecurityDetection[];
  sanitizedPrompt: string;
  pipeline: PipelineStageResult[];
}

export interface SecurityDetection {
  type: string;
  value: string;
  confidence: number;
}

export type StageState = "waiting" | "running" | "passed" | "warning" | "blocked";

export interface PipelineStageResult {
  name: string;
  state: StageState;
  detail?: string | undefined;
}

export interface AuditLog {
  requestId: string;
  timestamp: string;
  user: string;
  department: Department;
  role: UserRole;
  model: string;
  decision: DecisionType;
  riskScore: number;
  detections: string[];
  latencyMs: number;
  status: "Success" | "Blocked" | "Error";
  authStatus: string;
  policyResult: string;
  sanitizedPrompt: string;
  llmStatus: string;
  responseScan: string;
  securityChecks: { name: string; result: string }[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  category:
    | "PII"
    | "PHI"
    | "Secrets"
    | "Prompt Injection"
    | "Model Access"
    | "Rate Limit"
    | "Content Policy"
    | "DLP";
  severity: Severity;
  threshold: number;
  action: "Allow" | "Alert" | "Redact" | "Block" | "Restrict";
  appliesTo: "Organization" | "Department" | "Role" | "User";
  appliesToValue?: string | undefined;
  enabled: boolean;
  updatedAt: string;
}

export interface DirectoryUser {
  id: string;
  username: string;
  name: string;
  email: string;
  department: Department;
  role: UserRole;
  modelAccess: string;
  status: "Active" | "Suspended" | "Invited";
  lastActive: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Record<string, boolean>;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: "External" | "Internal";
  status: "Available" | "Restricted" | "Disabled";
  riskTier: "Low" | "Medium" | "High";
  permittedDepartments: Department[];
  averageLatencyMs: number;
  dailyRequests: number;
  notes: string;
}

export interface AnalyticsBundle {
  requestVolume: TrafficPoint[];
  threatTrends: { label: string; injection: number; pii: number; secrets: number }[];
  piiCategories: ThreatCategory[];
  modelUsage: ThreatCategory[];
  departmentUsage: ThreatCategory[];
  blockedVsAllowed: DecisionBreakdown[];
  riskDistribution: ThreatCategory[];
  latencyTrend: { label: string; latency: number }[];
}

export interface ServiceStatus {
  name: string;
  status: "Healthy" | "Connected" | "Operational" | "Degraded" | "Down";
  detail: string;
}

export interface SystemHealth {
  services: ServiceStatus[];
  uptime: string;
  requestsPerMinute: number;
  averageLatencyMs: number;
  errorRate: number;
  activeConnections: number;
  databaseLatencyMs: number;
  cacheHitRate: number;
  instances: { name: string; status: "Healthy" | "Degraded"; region: string; load: number }[];
  throughput: { label: string; rpm: number; latency: number }[];
}

export interface GatewayRequest {
  prompt: string;
  model: string;
  role: UserRole;
  analyzeOnly?: boolean | undefined;
}

export interface RiskBreakdown {
  piiRisk: number;
  injectionRisk: number;
  secretRisk: number;
  policyRisk: number;
}

export interface GatewayResponse {
  requestId: string;
  decision: DecisionType;
  riskScore: number;
  riskLevel: RiskLevel;
  riskBreakdown: RiskBreakdown;
  detections: SecurityDetection[];
  originalPrompt: string;
  sanitizedPrompt: string;
  policyTriggered: string;
  processingTimeMs: number;
  pipeline: PipelineStageResult[];
  llmResponse?: string | undefined;
  responseScan?: string | undefined;
  blockedReason?: string | undefined;
}

export interface GatewaySettings {
  general: { organization: string; environment: string; defaultModel: string };
  security: {
    defaultRiskThreshold: number;
    injectionThreshold: number;
    piiHandling: "Redact" | "Block" | "Alert";
    enableResponseScanning: boolean;
    enableSecretDetection: boolean;
  };
  rateLimits: { maxRequestsPerMinute: number; burstAllowance: number };
  audit: { retentionDays: number; immutableStorage: boolean };
  notifications: { criticalEmail: boolean; slackAlerts: boolean; weeklyDigest: boolean };
  developer: { enableSemanticCache: boolean; verboseLogging: boolean };
}

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  time: string;
}
