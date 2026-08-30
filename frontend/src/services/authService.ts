import { ApiError, apiEndpoints, request, USE_MOCK_API } from "./api";
import { clearAuditCache, setAuditCacheScope } from "./auditService";
import { clearDashboardCache, setDashboardCacheScope } from "./dashboardService";
import { supabase } from "./supabaseClient";
import type { AuthUser } from "@/types";

const STORAGE_KEY = "sentinelai.session";
let cachedUser: AuthUser | null = null;
let profileRequest: Promise<AuthUser> | null = null;

function setProtectedCacheScope(user: AuthUser | null) {
  setDashboardCacheScope(user?.id ?? null);
  setAuditCacheScope(user?.id ?? null);
}

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

export interface SignupPayload extends LoginPayload {
  name?: string;
}

const roleMap: Record<string, AuthUser["role"]> = {
  admin: "Admin",
  security_analyst: "Security Analyst",
  developer: "Developer",
  employee: "Employee",
  auditor: "Auditor",
};

function mapBackendUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleMap[user.role] ?? "Employee",
    department: user.department as AuthUser["department"],
  };
}

export async function fetchCurrentUser(accessToken?: string): Promise<AuthUser> {
  const user = await request<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  }>({
    path: `${apiEndpoints.auth}/me`,
    authToken: accessToken,
    mock: () =>
      demoUser as unknown as {
        id: string;
        name: string;
        email: string;
        role: string;
        department: string;
      },
  });
  const mapped = mapBackendUser(user);
  cachedUser = mapped;
  setProtectedCacheScope(mapped);
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
  return mapped;
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const email = payload.email.trim().toLowerCase();
  if (USE_MOCK_API) {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const user = demoAccounts.find((account) => account.email.toLowerCase() === email);
    if (!user || payload.password.length < 6) {
      throw new Error("Use a demo account email and any password of at least 6 characters.");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    cachedUser = user;
    setProtectedCacheScope(user);
    return user;
  }
  if (!supabase) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: payload.password,
  });
  if (error) throw new Error(error.message);
  return fetchCurrentUser(data.session?.access_token);
}

export async function signup(payload: SignupPayload): Promise<"verify_email" | AuthUser> {
  if (USE_MOCK_API)
    throw new Error("Create account is available only in real authentication mode.");
  if (!supabase) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: { data: { name: payload.name?.trim() } },
  });
  if (error) throw new Error(error.message);
  if (!data.session) return "verify_email";
  return fetchCurrentUser(data.session.access_token);
}

export async function verifySession(): Promise<AuthUser | null> {
  if (cachedUser) return cachedUser;
  const stored = getStoredUser();
  if (USE_MOCK_API) return stored;
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  if (stored) {
    cachedUser = stored;
    setProtectedCacheScope(stored);
    void refreshTrustedProfile();
    return stored;
  }
  return refreshTrustedProfile();
}

export async function refreshTrustedProfile(): Promise<AuthUser | null> {
  if (profileRequest) return profileRequest;
  try {
    profileRequest = fetchCurrentUser();
    return await profileRequest;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSession();
    }
    return null;
  } finally {
    profileRequest = null;
  }
}

export async function logout() {
  await clearSession();
}

async function clearSession() {
  if (!USE_MOCK_API && supabase) await supabase.auth.signOut();
  cachedUser = null;
  setProtectedCacheScope(null);
  clearDashboardCache();
  clearAuditCache();
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    cachedUser = JSON.parse(raw) as AuthUser;
    setProtectedCacheScope(cachedUser);
    return cachedUser;
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(onUser: (user: AuthUser | null) => void) {
  if (USE_MOCK_API || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      cachedUser = null;
      setProtectedCacheScope(null);
      clearDashboardCache();
      clearAuditCache();
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      onUser(null);
      return;
    }
    if (event === "SIGNED_IN") {
      void refreshTrustedProfile().then(onUser);
      return;
    }
    if (event === "TOKEN_REFRESHED") {
      onUser(cachedUser ?? getStoredUser());
    }
  });
  return () => data.subscription.unsubscribe();
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
