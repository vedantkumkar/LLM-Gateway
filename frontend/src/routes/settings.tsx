import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatusPill } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getAvailableModelNames } from "@/services/gatewayService";
import { getSettings, resetSettings, updateSettings } from "@/services/healthService";
import type { GatewaySettings } from "@/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Gateway Settings · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Configure risk thresholds, PII handling, rate limits, audit retention and gateway notifications.",
      },
      { property: "og:title", content: "Gateway Settings" },
      {
        property: "og:description",
        content: "General, security, model, rate limit, audit and developer configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`field-${label.replace(/\s+/g, "-").toLowerCase()}`}>{label}</Label>
      <div className="relative">
        <Input
          id={`field-${label.replace(/\s+/g, "-").toLowerCase()}`}
          type="number"
          value={value}
          min={0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className={suffix ? "pr-14" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [draft, setDraft] = useState<GatewaySettings | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([getSettings(), getAvailableModelNames()])
      .then(([s, m]) => {
        setDraft(s);
        setModels(m);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (fn: (d: GatewaySettings) => GatewaySettings) => {
    setDraft((d) => (d ? fn(d) : d));
    setSaved(false);
  };

  const save = () => {
    if (!draft || saving) return;
    setSaving(true);
    updateSettings(draft)
      .then((s) => {
        setDraft(s);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const reset = () => {
    if (saving) return;
    setLoading(true);
    setError(null);
    resetSettings()
      .then((s) => {
        setDraft(s);
        setSaved(false);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <AppShell
      title="Settings"
      heading="Gateway Settings"
      subheading="Configure gateway behavior. Changes apply to the local demo only."
      actions={
        <div className="flex items-center gap-2">
          {saved && <StatusPill tone="safe">Saved</StatusPill>}
          <Button size="sm" variant="outline" onClick={reset} disabled={loading || saving}>
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </Button>
          <Button size="sm" onClick={save} disabled={loading || saving || !draft}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading || !draft ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SectionCard title="General" subtitle="Organization identity">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="org-name">Organization</Label>
                <Input
                  id="org-name"
                  value={draft.general.organization}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      general: { ...d.general, organization: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-env">Environment</Label>
                <Input
                  id="org-env"
                  value={draft.general.environment}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      general: { ...d.general, environment: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Security" subtitle="Detection thresholds and scanning controls">
            <div className="grid gap-3">
              <SliderField
                label="Default Risk Threshold"
                value={draft.security.defaultRiskThreshold}
                min={0}
                max={100}
                step={5}
                unit="/ 100"
                onChange={(v) =>
                  update((d) => ({ ...d, security: { ...d.security, defaultRiskThreshold: v } }))
                }
              />
              <SliderField
                label="Prompt Injection Threshold"
                value={draft.security.injectionThreshold}
                min={0}
                max={100}
                step={5}
                unit="/ 100"
                onChange={(v) =>
                  update((d) => ({ ...d, security: { ...d.security, injectionThreshold: v } }))
                }
              />
              <div className="grid gap-1.5">
                <Label>PII Handling</Label>
                <Select
                  value={draft.security.piiHandling}
                  onValueChange={(v) =>
                    update((d) => ({
                      ...d,
                      security: {
                        ...d.security,
                        piiHandling: v as GatewaySettings["security"]["piiHandling"],
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Redact", "Block", "Alert"] as const).map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SettingSwitch
                title="Enable Response Scanning"
                description="Scan model responses for sensitive data and unsafe content."
                checked={draft.security.enableResponseScanning}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, security: { ...d.security, enableResponseScanning: v } }))
                }
              />
              <SettingSwitch
                title="Enable Secret Detection"
                description="Detect API keys, credentials and tokens in prompts."
                checked={draft.security.enableSecretDetection}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, security: { ...d.security, enableSecretDetection: v } }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Models" subtitle="Default routing configuration">
            <div className="grid gap-1.5">
              <Label>Default Model</Label>
              <Select
                value={draft.general.defaultModel}
                onValueChange={(v) =>
                  update((d) => ({ ...d, general: { ...d.general, defaultModel: v } }))
                }
              >
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
              <p className="text-xs text-muted-foreground">
                Used when a request does not specify a model explicitly.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Rate Limits" subtitle="Per-user request throttling">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Maximum Requests Per Minute"
                value={draft.rateLimits.maxRequestsPerMinute}
                suffix="/min"
                onChange={(v) =>
                  update((d) => ({
                    ...d,
                    rateLimits: { ...d.rateLimits, maxRequestsPerMinute: v },
                  }))
                }
              />
              <NumberField
                label="Burst Allowance"
                value={draft.rateLimits.burstAllowance}
                suffix="requests"
                onChange={(v) =>
                  update((d) => ({ ...d, rateLimits: { ...d.rateLimits, burstAllowance: v } }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Audit" subtitle="Retention and storage policy">
            <div className="grid gap-3">
              <NumberField
                label="Audit Retention Days"
                value={draft.audit.retentionDays}
                suffix="days"
                onChange={(v) => update((d) => ({ ...d, audit: { ...d.audit, retentionDays: v } }))}
              />
              <SettingSwitch
                title="Immutable Storage"
                description="Write audit records to append-only storage."
                checked={draft.audit.immutableStorage}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, audit: { ...d.audit, immutableStorage: v } }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Notifications" subtitle="Alert delivery channels">
            <div className="grid gap-2.5">
              <SettingSwitch
                title="Critical Email Alerts"
                description="Email on-call security staff for critical events."
                checked={draft.notifications.criticalEmail}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, notifications: { ...d.notifications, criticalEmail: v } }))
                }
              />
              <SettingSwitch
                title="Slack Alerts"
                description="Push high-severity events to the security channel."
                checked={draft.notifications.slackAlerts}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, notifications: { ...d.notifications, slackAlerts: v } }))
                }
              />
              <SettingSwitch
                title="Weekly Digest"
                description="Summarize gateway activity every Monday."
                checked={draft.notifications.weeklyDigest}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, notifications: { ...d.notifications, weeklyDigest: v } }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Developer" subtitle="Performance and diagnostics">
            <div className="grid gap-2.5">
              <SettingSwitch
                title="Enable Semantic Cache"
                description="Cache responses for semantically similar prompts."
                checked={draft.developer.enableSemanticCache}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, developer: { ...d.developer, enableSemanticCache: v } }))
                }
              />
              <SettingSwitch
                title="Verbose Logging"
                description="Emit debug-level logs for troubleshooting."
                checked={draft.developer.verboseLogging}
                onCheckedChange={(v) =>
                  update((d) => ({ ...d, developer: { ...d.developer, verboseLogging: v } }))
                }
              />
            </div>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
