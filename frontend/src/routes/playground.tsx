import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Play, ScanSearch, ShieldAlert, ShieldCheck, ShieldHalf } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PipelineView } from "@/components/security/PipelineView";
import { RiskScore, StatusPill } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PIPELINE_STAGES } from "@/services/mockSecurityEngine";
import { PROMPT_PRESETS, analyzePrompt, sendSecurePrompt } from "@/services/gatewayService";
import { ApiError } from "@/services/api";
import { getStoredUser } from "@/services/authService";
import type { GatewayResponse, PipelineStageResult, UserRole } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Secure AI Playground · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Test prompts through the enterprise security pipeline: DLP scanning, injection defense, policy decisions and redaction.",
      },
      { property: "og:title", content: "Secure AI Playground" },
      {
        property: "og:description",
        content:
          "Run prompts through the enterprise LLM security pipeline and inspect every stage.",
      },
    ],
  }),
  component: PlaygroundPage,
});

const models = ["GPT Enterprise", "Claude Enterprise", "Internal Secure LLM", "Gemini Enterprise"];

const idleStages: PipelineStageResult[] = PIPELINE_STAGES.map((name) => ({
  name,
  state: "waiting",
}));

const decisionMeta = {
  ALLOW: {
    title: "ALLOWED",
    detail: "Prompt passed all security policies.",
    className: "border-safe/40 bg-safe-soft text-safe",
    icon: ShieldCheck,
  },
  REDACT_AND_ALLOW: {
    title: "REDACTED & ALLOWED",
    detail: "Sensitive information was removed before forwarding to the model.",
    className: "border-warn/40 bg-warn-soft text-warn",
    icon: ShieldHalf,
  },
  BLOCK: {
    title: "BLOCKED",
    detail: "Request violated enterprise AI security policy.",
    className: "border-danger/40 bg-danger-soft text-danger",
    icon: ShieldAlert,
  },
} as const;

function PlaygroundPage() {
  const [model, setModel] = useState(models[0]!);
  const role: UserRole = getStoredUser()?.role ?? "Employee";
  const [prompt, setPrompt] = useState("");
  const [stages, setStages] = useState<PipelineStageResult[]>(idleStages);
  const [result, setResult] = useState<GatewayResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzeOnly, setLastAnalyzeOnly] = useState(false);
  const [showSlowBackendMessage, setShowSlowBackendMessage] = useState(false);
  const slowBackendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlowBackendTimer = () => {
    if (slowBackendTimer.current) {
      clearTimeout(slowBackendTimer.current);
      slowBackendTimer.current = null;
    }
    setShowSlowBackendMessage(false);
  };

  useEffect(
    () => () => {
      if (slowBackendTimer.current) clearTimeout(slowBackendTimer.current);
    },
    [],
  );

  const animateStages = async (final: PipelineStageResult[]) => {
    let current = idleStages.map((s) => ({ ...s }));
    for (let i = 0; i < final.length; i += 1) {
      current = current.map((s, idx) =>
        idx < i ? final[idx]! : idx === i ? { ...s, state: "running" as const } : s,
      );
      setStages(current);
      await new Promise((r) => setTimeout(r, 110));
      if (final[i]?.state === "blocked") {
        setStages(final.map((s, idx) => (idx <= i ? s : { ...s, state: "waiting" as const })));
        break;
      }
    }
    setStages(final);
  };

  const run = async (analyzeOnly: boolean) => {
    if (!prompt.trim() || running) return;
    setLastAnalyzeOnly(analyzeOnly);
    setRunning(true);
    setError(null);
    setResult(null);
    setStages(idleStages);
    clearSlowBackendTimer();
    slowBackendTimer.current = setTimeout(() => {
      setShowSlowBackendMessage(true);
    }, 5000);
    try {
      const response = analyzeOnly
        ? await analyzePrompt({ prompt, model, role, analyzeOnly: true })
        : await sendSecurePrompt({ prompt, model, role });
      await animateStages(response.pipeline);
      setResult(response);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 408
          ? "Gateway took too long to respond. It may still be starting up - please retry."
          : e instanceof Error
            ? e.message
            : "Gateway request failed.",
      );
      setStages(idleStages);
    } finally {
      clearSlowBackendTimer();
      setRunning(false);
    }
  };

  const meta = result ? decisionMeta[result.decision] : null;

  return (
    <AppShell
      title="Secure Playground"
      heading="Secure AI Playground"
      subheading="Test prompts through the enterprise security pipeline."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="grid gap-5">
          <SectionCard title="Prompt Composer" subtitle="Choose a model and prompt to evaluate">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Authenticated Role</Label>
                <Select value={role} disabled>
                  <SelectTrigger aria-readonly="true" aria-label="Authenticated role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={role}>{role}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-1.5">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                rows={7}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt to test the security gateway..."
                className="font-mono text-xs"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPrompt(p.prompt)}
                  className="rounded-full border border-border bg-surface-strong px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void run(false)} disabled={running || !prompt.trim()}>
                {running ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                Analyze &amp; Send Securely
              </Button>
              <Button
                variant="outline"
                onClick={() => void run(true)}
                disabled={running || !prompt.trim()}
              >
                <ScanSearch className="mr-2 size-4" /> Analyze Only
              </Button>
            </div>

            {showSlowBackendMessage && running && (
              <p className="mt-3 text-xs text-muted-foreground">
                Gateway is starting up. The first request may take up to a minute.
              </p>
            )}

            {error && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={() => void run(lastAnalyzeOnly)}>
                  Retry
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Security Pipeline" subtitle="Nine-stage enterprise gateway flow">
            <PipelineView stages={stages} />
          </SectionCard>
        </div>

        <div className="grid gap-5">
          {meta && result ? (
            <div className={cn("card-surface border p-4", meta.className)}>
              <div className="flex items-start gap-3">
                <meta.icon className="mt-0.5 size-6 shrink-0" aria-hidden />
                <div>
                  <p className="text-lg font-semibold tracking-tight">{meta.title}</p>
                  <p className="text-sm opacity-90">{meta.detail}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="opacity-70">Risk Score</dt>
                  <dd className="font-mono text-sm font-semibold">{result.riskScore} / 100</dd>
                </div>
                <div>
                  <dt className="opacity-70">Policy Triggered</dt>
                  <dd className="font-medium">{result.policyTriggered}</dd>
                </div>
                <div>
                  <dt className="opacity-70">Request ID</dt>
                  <dd className="font-mono">{result.requestId}</dd>
                </div>
                <div>
                  <dt className="opacity-70">Processing Time</dt>
                  <dd className="font-mono">{result.processingTimeMs} ms</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="card-surface grid place-items-center p-10 text-center">
              <ShieldCheck className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No analysis yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Pick a quick-test chip or write a prompt, then run it through the gateway to see the
                security decision.
              </p>
            </div>
          )}

          {result && (
            <>
              <SectionCard title="Security Analysis" subtitle="Risk contribution by detector">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-mono text-3xl font-semibold">{result.riskScore}</p>
                    <p className="text-xs text-muted-foreground">/ 100 overall risk</p>
                  </div>
                  <StatusPill
                    tone={
                      result.riskLevel === "CRITICAL" || result.riskLevel === "HIGH"
                        ? "danger"
                        : result.riskLevel === "MEDIUM"
                          ? "warn"
                          : "safe"
                    }
                  >
                    {result.riskLevel}
                  </StatusPill>
                </div>
                <ul className="mt-4 grid gap-2">
                  {[
                    ["PII Detection", result.riskBreakdown.piiRisk],
                    ["Injection Risk", result.riskBreakdown.injectionRisk],
                    ["Secret Exposure", result.riskBreakdown.secretRisk],
                    ["Policy Risk", result.riskBreakdown.policyRisk],
                  ].map(([label, score]) => (
                    <li
                      key={label as string}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <RiskScore score={score as number} />
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard
                title="Sensitive Data Detected"
                subtitle={
                  result.detections.length
                    ? "Values are masked — full sensitive data is never rendered"
                    : "No sensitive entities found in this prompt"
                }
              >
                {result.detections.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.detections.map((d, i) => (
                      <div
                        key={`${d.type}-${i}`}
                        className="rounded-md border border-border bg-surface-strong p-3"
                      >
                        <p className="font-mono text-[11px] font-semibold tracking-wide text-primary">
                          {d.type}
                        </p>
                        <p className="mt-1 font-mono text-xs break-all">{d.value}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Confidence: {d.confidence}%
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The DLP engine found no PII, PHI, payment or secret material.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Prompt Redaction" subtitle="Original vs sanitized payload">
                <div className="grid gap-3">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Original Prompt
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-md border border-border bg-surface-strong p-3 font-mono text-xs whitespace-pre-wrap">
                      {result.originalPrompt}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Sanitized Prompt
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-md border border-warn/30 bg-warn-soft/60 p-3 font-mono text-xs whitespace-pre-wrap">
                      {result.sanitizedPrompt}
                    </pre>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title={result.decision === "BLOCK" ? "Request Blocked" : "Secure LLM Response"}
                subtitle={
                  result.decision === "BLOCK"
                    ? "No data was forwarded to the provider"
                    : (result.responseScan ?? "Analyze-only mode — no provider call made")
                }
              >
                {result.decision === "BLOCK" ? (
                  <p className="rounded-md border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
                    {result.blockedReason}
                  </p>
                ) : result.llmResponse ? (
                  <>
                    <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-strong p-3 text-xs whitespace-pre-wrap">
                      {result.llmResponse}
                    </pre>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-safe">
                      <ShieldCheck className="size-3.5" /> Response scanned successfully
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Analyze-only mode: the prompt was evaluated but never sent to a model provider.
                  </p>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
