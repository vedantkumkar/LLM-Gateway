import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  Lock,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USE_MOCK_API } from "@/services/api";
import { demoAccounts, login, signup } from "@/services/authService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelAI Gateway · Secure Enterprise GenAI" },
      {
        name: "description",
        content:
          "Secure enterprise AI access. Protect every prompt, control every model and audit every LLM interaction with SentinelAI Gateway.",
      },
      { property: "og:title", content: "SentinelAI Gateway — Secure Enterprise AI Access" },
      {
        property: "og:description",
        content:
          "Enterprise LLM security gateway: DLP, prompt-injection defense, RBAC and full audit trails.",
      },
    ],
  }),
  component: LoginPage,
});

const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure by design",
    detail: "Security controls before provider access",
  },
  {
    icon: Zap,
    title: "Real-time protection",
    detail: "Inspect every AI request",
  },
  {
    icon: Lock,
    title: "Enterprise ready",
    detail: "Roles, policies and audit visibility",
  },
];

const valueStrip = [
  {
    icon: Eye,
    title: "Prompt Visibility",
    detail: "Inspect AI interactions through the security gateway.",
    className: "landing-value-cyan",
  },
  {
    icon: Sparkles,
    title: "Sensitive Data Redaction",
    detail: "Detect and mask sensitive information before provider processing.",
    className: "landing-value-magenta",
  },
  {
    icon: ShieldCheck,
    title: "Policy Enforcement",
    detail: "Apply enterprise security policies before model access.",
    className: "landing-value-teal",
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "Prompt Protection",
    detail: "Inspect, filter, and block risky prompts before they reach any model.",
    className: "landing-feature-purple",
  },
  {
    icon: EyeOff,
    title: "Sensitive Data Redaction",
    detail: "Detect and redact PII, secrets, payment data, and proprietary information.",
    className: "landing-feature-pink",
  },
  {
    icon: Brain,
    title: "Model Control",
    detail: "Route, restrict, and govern model usage across providers.",
    className: "landing-feature-violet",
  },
  {
    icon: Lock,
    title: "Secrets Protection",
    detail: "Detect exposed keys and prevent sensitive material from leaving the gateway.",
    className: "landing-feature-teal",
  },
  {
    icon: FileCheck2,
    title: "Compliance & Audit",
    detail: "Full audit trails, reporting, and data retention controls.",
    className: "landing-feature-blue",
  },
  {
    icon: ScrollText,
    title: "Policy Enforcement",
    detail: "Apply configurable guardrails across users, roles, and models.",
    className: "landing-feature-magenta",
  },
];

const previewMetrics = [
  {
    label: "Total Requests",
    value: "1,284",
    delta: "Monitored",
    className: "landing-preview-cyan",
  },
  { label: "Blocked Requests", value: "47", delta: "Blocked", className: "landing-preview-red" },
  { label: "Redactions", value: "93", delta: "Protected", className: "landing-preview-violet" },
  { label: "Active Policies", value: "12", delta: "Enforced", className: "landing-preview-teal" },
];

const floatingLabels = [
  { icon: MessageSquare, label: "Prompts", className: "landing-float-label--prompts" },
  { icon: Cpu, label: "Models", className: "landing-float-label--models" },
  { icon: Lock, label: "Secrets", className: "landing-float-label--secrets" },
  { icon: FileCheck2, label: "Compliance", className: "landing-float-label--compliance" },
];

function scrollToAuth() {
  document.getElementById("gateway-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToFeatures() {
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToSecurity() {
  document
    .getElementById("security-controls")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("security@example.com");
  const [password, setPassword] = useState("demo-password");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) {
      setError("Enter a valid corporate email and a password of at least 6 characters.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signup" && !USE_MOCK_API) {
        const result = await signup({ email, password, name });
        if (result === "verify_email") {
          setNotice("Account created. Verify your email before signing in.");
          return;
        }
      } else {
        await login({ email, password });
      }
      await navigate({ to: "/overview" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to establish a session. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-page min-h-screen overflow-hidden">
      <div className="landing-grid" aria-hidden />
      <div className="landing-particles" aria-hidden />
      <div className="landing-streaks" aria-hidden />

      <header className="landing-nav">
        <a href="#top" className="landing-brand focus-visible:outline-none">
          <span className="landing-logo">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <span className="text-2xl font-semibold text-white">
            SentinelAI <span className="font-medium text-cyan-300">Gateway</span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-8 text-sm text-white/85 md:flex"
          aria-label="Landing"
        >
          <button type="button" className="landing-nav-link" onClick={scrollToFeatures}>
            Features
          </button>
          <button type="button" className="landing-nav-link" onClick={scrollToSecurity}>
            Security
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={scrollToAuth}
          >
            Sign in
          </Button>
        </div>
      </header>

      <section id="top" className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-copy">
            <div className="landing-badge">
              <ShieldCheck className="size-4" aria-hidden />
              Built for Enterprise AI
            </div>

            <h1>
              Your Secure
              <br />
              Gateway to
              <br />
              <span>Enterprise GenAI</span>
            </h1>
            <p>
              Centralized protection for prompts, models, sensitive data, and enterprise AI
              policies.
            </p>

            <div className="landing-cta-row">
              <Button
                type="button"
                className="landing-gradient-button landing-hero-button"
                onClick={scrollToAuth}
              >
                Access Gateway
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="landing-secondary-button landing-hero-button"
                onClick={scrollToFeatures}
              >
                Explore Features
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Button>
            </div>

            <div className="landing-benefits">
              {benefits.map((benefit) => (
                <article key={benefit.title}>
                  <benefit.icon className="size-6 text-cyan-300" aria-hidden />
                  <div>
                    <h2>{benefit.title}</h2>
                    <p>{benefit.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-visual-zone" aria-hidden="true">
            <div className="landing-orbit landing-orbit-outer" />
            <div className="landing-orbit landing-orbit-middle" />
            <div className="landing-orbit landing-orbit-inner" />
            <div className="landing-energy-column" />
            <div className="landing-circuit-floor">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="landing-gateway-core">
              <div className="landing-shield-shell">
                <span>S</span>
              </div>
            </div>
            <div className="landing-platform landing-platform-one" />
            <div className="landing-platform landing-platform-two" />
            {floatingLabels.map((item) => (
              <div key={item.label} className={`landing-float-label ${item.className}`}>
                <item.icon className="size-4" />
                {item.label}
              </div>
            ))}
          </div>

          <aside className="landing-dashboard-preview" aria-label="Decorative dashboard preview">
            <div className="landing-preview-shell">
              <div className="landing-preview-sidebar">
                <div className="landing-preview-brand">
                  <ShieldCheck className="size-4" aria-hidden />
                  SentinelAI
                </div>
                {["Overview", "Security Events", "Policies", "Models", "Audit Logs"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="landing-preview-main">
                <div className="landing-preview-top">
                  <div>
                    <h2>Overview</h2>
                    <p>Security gateway preview</p>
                  </div>
                  <span>Last 7 days</span>
                </div>

                <div className="landing-preview-metrics">
                  {previewMetrics.map((metric) => (
                    <article key={metric.label} className={metric.className}>
                      <p>{metric.label}</p>
                      <strong>{metric.value}</strong>
                      <span>{metric.delta}</span>
                    </article>
                  ))}
                </div>

                <div className="landing-preview-grid">
                  <article className="landing-chart-card landing-chart-wide">
                    <h3>Traffic Over Time</h3>
                    <svg viewBox="0 0 280 110" role="img" aria-label="Decorative traffic chart">
                      <path d="M8 80 C 42 42, 70 95, 100 56 S 158 54, 188 38 S 238 78, 272 28" />
                      <path d="M8 92 C 45 75, 74 88, 104 68 S 160 75, 190 58 S 236 76, 272 48" />
                      <path d="M8 102 C 48 94, 78 98, 108 84 S 165 91, 194 78 S 240 88, 272 66" />
                    </svg>
                  </article>
                  <article className="landing-chart-card">
                    <h3>Risk Distribution</h3>
                    <div className="landing-donut">
                      <span>Preview</span>
                    </div>
                  </article>
                </div>

                <article className="landing-alert-card">
                  <h3>Recent Security Events</h3>
                  <p>
                    Prompt injection blocked <span>High</span>
                  </p>
                  <p>
                    PII detected and redacted <span>Medium</span>
                  </p>
                  <p>
                    Restricted data policy triggered <span>High</span>
                  </p>
                </article>
              </div>
            </div>
          </aside>
        </div>

        <div id="security-controls" className="landing-value-strip">
          {valueStrip.map((item) => (
            <article key={item.title} className={item.className}>
              <span>
                <item.icon className="size-7" aria-hidden />
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="landing-light-section">
        <div className="mx-auto w-full max-w-[118rem] px-6 py-10 lg:px-16">
          <h2 className="text-center text-2xl font-semibold text-slate-950 md:text-3xl">
            Everything you need to <span className="text-cyan-500">secure</span> and{" "}
            <span className="text-violet-500">govern</span> GenAI
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className={`landing-feature-icon ${feature.className}`}>
                  <feature.icon className="size-6" aria-hidden />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="landing-auth-section">
        <div
          id="gateway-access"
          className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"
        >
          <div className="landing-auth-copy">
            <p className="text-sm font-semibold text-cyan-300">Secure Console</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Access the SentinelAI Gateway
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              {mode === "signup" && !USE_MOCK_API
                ? "Create an account to request access to the security console."
                : "Sign in with your authorized enterprise account to open the security console."}
            </p>
            <div className="landing-trust-list">
              {["Secure authentication", "Role-based access", "Audited sessions"].map((item) => (
                <div key={item}>
                  <CheckCircle2 className="size-4 text-cyan-300" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-auth-card">
            <div className="mb-7 flex items-center gap-3">
              <span className="landing-logo">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">SentinelAI Gateway</p>
                <p className="text-[11px] text-slate-400">Enterprise AI Security</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white">
              {mode === "signup" && !USE_MOCK_API
                ? "Create gateway account"
                : "Sign in to the gateway"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Use your corporate credentials to continue.
            </p>
            {mode === "signup" && !USE_MOCK_API && (
              <p className="landing-role-note">
                New accounts start with Employee access. An administrator can assign additional
                permissions after account creation.
              </p>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-4">
              {mode === "signup" && !USE_MOCK_API && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-slate-200">
                    Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="landing-input"
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-slate-200">
                  Corporate Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="landing-input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="landing-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded text-slate-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-md border border-safe/30 bg-safe-soft px-3 py-2 text-xs text-safe">
                  {notice}
                </p>
              )}

              <Button type="submit" disabled={loading} className="landing-gradient-button w-full">
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "signup" && !USE_MOCK_API ? "Create Account" : "Sign In"}
              </Button>
              {!USE_MOCK_API && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                  disabled={loading}
                  onClick={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
                >
                  {mode === "signin" ? "Create account" : "Use existing account"}
                </Button>
              )}
            </form>

            {USE_MOCK_API && (
              <div className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Demo accounts</p>
                <div className="mt-2 grid gap-1">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setEmail(account.email)}
                      className="flex items-center justify-between rounded px-2 py-1 text-left text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                    >
                      <span>{account.role}</span>
                      <span className="font-mono">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
