import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  FileSearch,
  Fingerprint,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldHalf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoAccounts, login } from "@/services/authService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In · SentinelAI Gateway" },
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

const highlights = [
  { icon: Fingerprint, title: "Zero Trust Access", detail: "Every prompt authenticated and authorized" },
  { icon: ShieldHalf, title: "Prompt Protection", detail: "Injection and jailbreak defense at the edge" },
  { icon: Lock, title: "Data Loss Prevention", detail: "PII, PHI and secret redaction before egress" },
  { icon: FileSearch, title: "Continuous Audit", detail: "Immutable traceability for every request" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("security@example.com");
  const [password, setPassword] = useState("demo-password");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) {
      setError("Enter a valid corporate email and a password of at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      await navigate({ to: "/overview" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to establish a session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="grid-fade relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-primary/20 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">SentinelAI Gateway</p>
            <p className="text-[11px] text-sidebar-muted">Enterprise AI Security</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">Secure Enterprise AI Access</h1>
          <p className="mt-3 text-sm text-sidebar-muted">
            Protect every prompt. Control every model. Audit every interaction.
          </p>
          <ul className="mt-8 grid gap-3">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3">
                <h.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-sidebar-muted">{h.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-sidebar-muted">
          Protected by Enterprise AI Security Gateway · Demo Environment
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">SentinelAI Gateway</p>
              <p className="text-[11px] text-muted-foreground">Enterprise AI Security</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight">Sign in to the gateway</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your corporate credentials to continue.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Corporate Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign In
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={loading}>
              Corporate SSO unavailable in demo
            </Button>
          </form>

          <div className="mt-4 rounded-md border border-border bg-card p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Demo accounts
            </p>
            <div className="mt-2 grid gap-1">
              {demoAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setEmail(account.email)}
                  className="flex items-center justify-between rounded px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <span>{account.role}</span>
                  <span className="font-mono">{account.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 lg:hidden">
            {highlights.map((h) => (
              <span key={h.title} className="rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground">
                {h.title}
              </span>
            ))}
          </div>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Protected by Enterprise AI Security Gateway
          </p>
        </div>
      </section>
    </div>
  );
}
