import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  Lock,
  Menu,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  ShieldX,
  UserCheck,
  X,
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
    title: "Prompt Inspection",
    detail: "Every request is evaluated before provider access.",
  },
  {
    icon: Lock,
    title: "Sensitive Data Protection",
    detail: "PII and secrets are detected before they leave your boundary.",
  },
  {
    icon: FileCheck2,
    title: "Policy Enforcement",
    detail: "Role-aware controls govern prompts, models, and workflows.",
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "Prompt Protection",
    detail: "Inspect, filter, and block risky prompts before they reach any model.",
  },
  {
    icon: EyeOff,
    title: "Sensitive Data Redaction",
    detail: "Detect and redact PII, secrets, payment data, and proprietary information.",
  },
  {
    icon: Lock,
    title: "Secret Detection",
    detail: "Catch exposed API keys, credentials, and sensitive tokens in prompts.",
  },
  {
    icon: ShieldX,
    title: "Policy Enforcement",
    detail: "Apply configurable guardrails across users, roles, and models.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access",
    detail: "Keep model access aligned with enterprise responsibilities.",
  },
  {
    icon: ScrollText,
    title: "Audit Visibility",
    detail: "Preserve searchable records for security review and governance.",
  },
];

const hudCards = [
  {
    icon: ShieldCheck,
    title: "ACCESS MONITORED",
    detail: "All systems secure",
    className: "landing-hud-card-left",
  },
  {
    icon: Lock,
    title: "THREAT DETECTED",
    detail: "Prevented · Risk mitigated",
    className: "landing-hud-card-right",
  },
  {
    icon: FileCheck2,
    title: "POLICY ENFORCED",
    detail: "Restricted request blocked",
    className: "landing-hud-card-low",
  },
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
  const [menuOpen, setMenuOpen] = useState(false);
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
      <section id="top" className="landing-hero">
        <img
          className="landing-reference-hero"
          src="/sentinel-hacker-hero.png"
          alt=""
          aria-hidden
        />
        <header className="landing-nav">
          <a href="#top" className="landing-brand focus-visible:outline-none">
            <span className="landing-logo">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span className="landing-brand-text">
              SentinelAI <span className="font-medium text-cyan-300">Gateway</span>
            </span>
          </a>

          <div className="landing-menu-wrap">
            <button
              type="button"
              className="landing-menu-button"
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>MENU</span>
              {menuOpen ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
            </button>
            {menuOpen && (
              <div id="landing-menu" className="landing-menu-panel">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    scrollToFeatures();
                  }}
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    scrollToSecurity();
                  }}
                >
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    scrollToAuth();
                  }}
                >
                  Access Gateway
                </button>
              </div>
            )}
          </div>
        </header>
        <button
          type="button"
          className="landing-reference-cta"
          onClick={scrollToAuth}
          aria-label="Access Gateway"
        />
        <div className="landing-cyber-scene" aria-hidden>
          <div className="landing-code-rain landing-code-left">
            <span>if risk.score &gt; policy.limit</span>
            <span>mask(secret.value)</span>
            <span>deny prompt.inject()</span>
            <span>audit.write(event)</span>
          </div>
          <div className="landing-code-rain landing-code-right">
            <span>rbac.verify(user.role)</span>
            <span>dlp.scan(payload)</span>
            <span>model.route(secure)</span>
          </div>
          <div className="landing-world-grid" />
          <div className="landing-hooded-figure">
            <div className="landing-hood" />
            <div className="landing-face-shadow" />
            <div className="landing-shoulders" />
          </div>
          {hudCards.map((card) => (
            <div key={card.title} className={`landing-hud-card ${card.className}`}>
              <card.icon className="size-6" aria-hidden />
              <div>
                <strong>{card.title}</strong>
                <span>{card.detail}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-hero-inner">
          <div className="landing-copy">
            <p className="landing-eyebrow">Secure AI Infrastructure</p>
            <h1>
              <span className="landing-headline-line">Defend enterprise AI</span>
              <span className="landing-headline-line">
                with <strong>intelligent security.</strong>
              </span>
            </h1>
            <p>
              <span>Protect prompts, models, secrets, and workflows</span>
              <span>with real-time policy enforcement and monitoring.</span>
            </p>

            <div className="landing-cta-row">
              <Button
                type="button"
                className="landing-gradient-button landing-hero-button"
                onClick={scrollToAuth}
              >
                <ShieldCheck className="mr-2 size-5" aria-hidden />
                Access Gateway
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Button>
            </div>

            <div className="landing-trust-note">
              <ShieldCheck className="size-5" aria-hidden />
              Built for security-focused teams
            </div>
          </div>
        </div>
      </section>

      <section id="security-controls" className="landing-value-strip">
        {benefits.map((benefit) => (
          <article key={benefit.title}>
            <benefit.icon className="size-5" aria-hidden />
            <div>
              <h2>{benefit.title}</h2>
              <p>{benefit.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section id="features" className="landing-features">
        <div>
          <p className="landing-section-kicker">Gateway Controls</p>
          <h2>Everything protecting your AI interactions</h2>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">
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
