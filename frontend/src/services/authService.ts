import { apiEndpoints, request, USE_MOCK_API } from "./api";
import type { AuthUser } from "@/types";

const STORAGE_KEY = "sentinelai.session";

export const demoAccounts: AuthUser[] = [
  {
    id: "u-admin",
    name: "Admin Demo",
    email: "admin@example.com",
    role: "Admin",
    department: "Security",
    token: "admin-demo-token",
  },
  {
    id: "u-security",
    name: "Security Analyst Demo",
    email: "security@example.com",
    role: "Security Analyst",
    department: "Security",
    token: "security-demo-token",
  },
  {
    id: "u-dev",
    name: "Developer Demo",
    email: "developer@example.com",
    role: "Developer",
    department: "Engineering",
    token: "developer-demo-token",
  },
  {
    id: "u-employee",
    name: "Employee Demo",
    email: "employee@example.com",
    role: "Employee",
    department: "Operations",
    token: "employee-demo-token",
  },
  {
    id: "u-auditor",
    name: "Auditor Demo",
    email: "auditor@example.com",
    role: "Auditor",
    department: "Legal",
    token: "auditor-demo-token",
  },
];

export const demoUser: AuthUser = {
  ...demoAccounts[1]!,
  department: "Security",
};

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  await new Promise((resolve) => window.setTimeout(resolve, USE_MOCK_API ? 650 : 220));
  const email = payload.email.trim().toLowerCase();
  const user = demoAccounts.find((account) => account.email.toLowerCase() === email);
  if (!user || payload.password.length < 6) {
    throw new Error("Use a demo account email and any password of at least 6 characters.");
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export function logout() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function getGatewayHealthStatus(): Promise<"healthy" | "degraded" | "down"> {
  const health = await request<{ status: string } | "healthy" | "degraded" | "down">({
    path: apiEndpoints.health,
    mockDelayMs: 200,
    mock: () => "healthy",
  });
  if (typeof health === "string") return health;
  return health.status === "healthy" ? "healthy" : "degraded";
}
