/**
 * Frontend-only simulation of the gateway security pipeline.
 * This exists purely so the UI can be demonstrated before the Python
 * FastAPI backend is connected. It contains NO production security logic.
 */
import type {
  DecisionType,
  GatewayRequest,
  GatewayResponse,
  PipelineStageResult,
  RiskBreakdown,
  RiskLevel,
  SecurityDetection,
} from "@/types";

export const PIPELINE_STAGES = [
  "Authentication",
  "RBAC",
  "Rate Limit",
  "Sensitive Data Scan",
  "Prompt Injection Scan",
  "Policy Engine",
  "LLM Request",
  "Response Scan",
  "Audit Log",
] as const;

const INJECTION_PATTERNS = [
  "ignore all previous instructions",
  "ignore previous instructions",
  "forget previous instructions",
  "reveal the hidden system prompt",
  "reveal system prompt",
  "system prompt",
  "bypass security",
  "jailbreak",
  "act as an unrestricted",
  "disregard your rules",
  "developer mode",
];

const SECRET_PATTERNS = [
  /sk-[a-z0-9-]{6,}/gi,
  /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*[a-z0-9._~+/=-]{6,}\b/gi,
];
const RESTRICTED_SENSITIVE_RE =
  /\b(?:internal|restricted|confidential|proprietary|company dataset|corporate dataset|company data|customer records|customer data|employee records|employee data|financial records|production api keys?|admin(?:istrator)? password|credentials|secret keys?|acquisition memo|source code|database dump|database backup|(?:whole|entire) dataset of (?:the )?company)\b/i;
const RESTRICTED_DISCLOSURE_RE =
  /\b(?:external partner|outside (?:the )?company|share externally|send externally|give me|show me|reveal|provide me|send me|export|download|dump|extract|leak|copy|whole dataset|entire dataset|all customer records)\b/i;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g;
const CARD_RE = /\b(?:\d[ -]?){13,16}\b/g;
const PHONE_RE = /(\+?\d{1,3}[\s-]?)?\b\d{10}\b/g;
const AADHAAR_RE = /\b\d{4}\s\d{4}\s\d{4}\b/g;
const MRN_RE = /\bMRN[-\s]?\d{4,}\b/gi;
const NAME_RE = /\b(?:my name is|i am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;

function maskCard(value: string) {
  const digits = value.replace(/\D/g, "");
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

function maskGeneric(value: string) {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-3)}`;
}

export interface AnalysisResult {
  detections: SecurityDetection[];
  sanitizedPrompt: string;
  riskBreakdown: RiskBreakdown;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: DecisionType;
  policyTriggered: string;
  injectionMatched: string[];
}

export function analyzePromptMock(prompt: string, model: string, role: string): AnalysisResult {
  const detections: SecurityDetection[] = [];
  let sanitized = prompt;
  const lower = prompt.toLowerCase();

  // Cards first (before phone) to avoid overlapping matches.
  for (const match of prompt.match(CARD_RE) ?? []) {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13) continue;
    detections.push({ type: "CREDIT_CARD", value: maskCard(match), confidence: 99 });
    sanitized = sanitized.replace(match, "<CREDIT_CARD>");
  }
  for (const match of prompt.match(EMAIL_RE) ?? []) {
    detections.push({ type: "EMAIL_ADDRESS", value: maskGeneric(match), confidence: 98 });
    sanitized = sanitized.replace(match, "<EMAIL_ADDRESS>");
  }
  for (const match of sanitized.match(PHONE_RE) ?? []) {
    detections.push({ type: "PHONE_NUMBER", value: maskGeneric(match.trim()), confidence: 96 });
    sanitized = sanitized.replace(match, "<PHONE_NUMBER>");
  }
  for (const match of prompt.match(AADHAAR_RE) ?? []) {
    detections.push({ type: "GOVERNMENT_ID", value: maskGeneric(match), confidence: 95 });
    sanitized = sanitized.replace(match, "<GOVERNMENT_ID>");
  }
  for (const match of prompt.match(MRN_RE) ?? []) {
    detections.push({ type: "MEDICAL_RECORD", value: maskGeneric(match), confidence: 94 });
    sanitized = sanitized.replace(match, "<MEDICAL_RECORD>");
  }
  for (const match of prompt.matchAll(NAME_RE)) {
    const name = match[1];
    if (!name) continue;
    detections.push({ type: "PERSON", value: maskGeneric(name), confidence: 91 });
    sanitized = sanitized.replace(name, "<PERSON>");
  }

  const secretHits: string[] = [];
  for (const re of SECRET_PATTERNS) {
    for (const match of prompt.match(re) ?? []) {
      secretHits.push(match);
    }
  }
  if (secretHits.length) {
    const first = secretHits[0]!;
    detections.push({ type: "SECRET", value: maskGeneric(first), confidence: 99 });
    for (const hit of secretHits) sanitized = sanitized.replace(hit, "<SECRET>");
    sanitized = sanitized.replace(/sk-[a-z0-9-]{6,}/gi, "<SECRET>");
  }

  const injectionMatched = INJECTION_PATTERNS.filter((p) => lower.includes(p));
  if (injectionMatched.length) {
    detections.push({
      type: "PROMPT_INJECTION",
      value: injectionMatched[0]!,
      confidence: 97,
    });
  }

  const piiTypes = detections.filter((d) =>
    [
      "EMAIL_ADDRESS",
      "PHONE_NUMBER",
      "CREDIT_CARD",
      "PERSON",
      "GOVERNMENT_ID",
      "MEDICAL_RECORD",
    ].includes(d.type),
  );

  const hasCard = detections.some((d) => d.type === "CREDIT_CARD");
  const hasSecret = secretHits.length > 0;
  const hasRestrictedDataExfiltration =
    RESTRICTED_SENSITIVE_RE.test(prompt) && RESTRICTED_DISCLOSURE_RE.test(prompt);

  const riskBreakdown: RiskBreakdown = {
    piiRisk: piiTypes.length ? Math.min(96, 45 + piiTypes.length * 12 + (hasCard ? 25 : 0)) : 0,
    injectionRisk: injectionMatched.length ? Math.min(98, 72 + injectionMatched.length * 8) : 4,
    secretRisk: hasSecret ? 94 : 0,
    policyRisk: 0,
  };

  const restrictedModel = model === "Gemini Enterprise" && role === "Employee";
  riskBreakdown.policyRisk = restrictedModel
    ? 85
    : hasRestrictedDataExfiltration
      ? 100
      : hasCard
        ? 70
        : piiTypes.length
          ? 35
          : injectionMatched.length
            ? 88
            : 5;

  const riskScore = Math.min(
    100,
    Math.round(
      Math.max(
        riskBreakdown.injectionRisk === 4 ? 6 : riskBreakdown.injectionRisk,
        riskBreakdown.secretRisk,
        riskBreakdown.piiRisk * 0.9,
        riskBreakdown.policyRisk * 0.85,
        riskBreakdown.policyRisk,
      ),
    ),
  );

  const riskLevel: RiskLevel =
    riskScore >= 85 ? "CRITICAL" : riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

  let decision: DecisionType = "ALLOW";
  let policyTriggered = "None";

  if (injectionMatched.length) {
    decision = "BLOCK";
    policyTriggered = "PL-003 · Block Prompt Injection";
  } else if (hasSecret) {
    decision = "BLOCK";
    policyTriggered = "PL-004 · Block Secret Keys";
  } else if (restrictedModel) {
    decision = "BLOCK";
    policyTriggered = "PL-005 · Employee External Model Policy";
  } else if (hasRestrictedDataExfiltration) {
    decision = "BLOCK";
    policyTriggered = "Restricted enterprise data disclosure/exfiltration";
  } else if (hasCard) {
    decision = "REDACT_AND_ALLOW";
    policyTriggered = "PL-001 · Block Payment Card Data (redaction mode)";
  } else if (piiTypes.length) {
    decision = "REDACT_AND_ALLOW";
    policyTriggered = "PL-002 · Redact Personal Data";
  }

  return {
    detections,
    sanitizedPrompt: decision === "BLOCK" ? sanitized : sanitized,
    riskBreakdown,
    riskScore,
    riskLevel,
    decision,
    policyTriggered,
    injectionMatched,
  };
}

export function buildPipelineResult(result: AnalysisResult, analyzeOnly: boolean) {
  const stages: PipelineStageResult[] = PIPELINE_STAGES.map((name) => ({
    name,
    state: "passed",
  }));

  const set = (name: string, state: PipelineStageResult["state"], detail?: string) => {
    const stage = stages.find((s) => s.name === name);
    if (stage) {
      stage.state = state;
      stage.detail = detail;
    }
  };

  set("Authentication", "passed", "Session token valid");
  set("RBAC", "passed", "Role permitted for requested model");
  set("Rate Limit", "passed", "Within 60 requests/minute");

  const piiCount = result.detections.filter((d) => d.type !== "PROMPT_INJECTION").length;
  set(
    "Sensitive Data Scan",
    piiCount ? "warning" : "passed",
    piiCount
      ? `${piiCount} sensitive entit${piiCount === 1 ? "y" : "ies"} detected`
      : "No entities detected",
  );
  set(
    "Prompt Injection Scan",
    result.injectionMatched.length ? "blocked" : "passed",
    `Score ${result.riskBreakdown.injectionRisk}/100`,
  );

  if (result.decision === "BLOCK") {
    set("Policy Engine", "blocked", result.policyTriggered);
    set("LLM Request", "waiting", "Never forwarded to provider");
    set("Response Scan", "waiting", "Skipped");
  } else if (result.decision === "REDACT_AND_ALLOW") {
    set("Policy Engine", "warning", result.policyTriggered);
    set(
      "LLM Request",
      analyzeOnly ? "waiting" : "passed",
      analyzeOnly ? "Analyze-only mode" : "Sanitized prompt forwarded",
    );
    set(
      "Response Scan",
      analyzeOnly ? "waiting" : "passed",
      analyzeOnly ? "Skipped" : "Response clean",
    );
  } else {
    set("Policy Engine", "passed", "No policy triggered");
    set(
      "LLM Request",
      analyzeOnly ? "waiting" : "passed",
      analyzeOnly ? "Analyze-only mode" : "Forwarded to provider",
    );
    set(
      "Response Scan",
      analyzeOnly ? "waiting" : "passed",
      analyzeOnly ? "Skipped" : "Response clean",
    );
  }

  set("Audit Log", "passed", "Event persisted to audit store");
  return stages;
}

function mockLlmAnswer(prompt: string, model: string) {
  const topic = prompt.replace(/\s+/g, " ").slice(0, 90);
  return `[${model}]\n\nHere is a concise, policy-compliant response to your request ("${topic}${prompt.length > 90 ? "…" : ""}").\n\n1. Zero trust assumes no implicit trust between components; every request is authenticated, authorized and continuously validated.\n2. Enterprise controls should be enforced at the gateway layer so that policy, redaction and audit are consistent across all model providers.\n3. Sensitive values were replaced with typed placeholders before this request reached the provider, so no regulated data left the corporate boundary.\n\nLet me know if you would like a deeper breakdown of any control.`;
}

let counter = 4821;

export function runGatewayMock(req: GatewayRequest): GatewayResponse {
  const analysis = analyzePromptMock(req.prompt, req.model, req.role);
  const pipeline = buildPipelineResult(analysis, Boolean(req.analyzeOnly));
  counter += 1;

  const blocked = analysis.decision === "BLOCK";

  return {
    requestId: `req_${counter.toString(16)}${Math.random().toString(16).slice(2, 8)}`,
    decision: analysis.decision,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    riskBreakdown: analysis.riskBreakdown,
    detections: analysis.detections,
    originalPrompt: req.prompt,
    sanitizedPrompt: analysis.sanitizedPrompt,
    policyTriggered: analysis.policyTriggered,
    processingTimeMs: 120 + Math.round(Math.random() * 140),
    pipeline,
    llmResponse:
      blocked || req.analyzeOnly ? undefined : mockLlmAnswer(analysis.sanitizedPrompt, req.model),
    responseScan: blocked || req.analyzeOnly ? undefined : "Response scanned successfully",
    blockedReason: blocked ? "Request was blocked before reaching the external LLM." : undefined,
  };
}
