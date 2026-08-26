import type { UserRole } from "@/types";

export type AppRoute =
  | "/overview"
  | "/security-events"
  | "/analytics"
  | "/playground"
  | "/models"
  | "/policies"
  | "/users"
  | "/audit-logs"
  | "/system-health"
  | "/settings";

export const roleAccess: Record<UserRole, AppRoute[]> = {
  Admin: [
    "/overview",
    "/security-events",
    "/analytics",
    "/playground",
    "/models",
    "/policies",
    "/users",
    "/audit-logs",
    "/system-health",
    "/settings",
  ],
  "Security Analyst": [
    "/overview",
    "/security-events",
    "/analytics",
    "/playground",
    "/models",
    "/policies",
    "/audit-logs",
    "/system-health",
  ],
  Developer: ["/playground", "/models", "/policies", "/audit-logs", "/system-health"],
  Employee: ["/playground", "/models", "/audit-logs"],
  Auditor: ["/overview", "/security-events", "/policies", "/audit-logs", "/system-health"],
};

export const firstAllowedRoute: Record<UserRole, AppRoute> = {
  Admin: "/overview",
  "Security Analyst": "/overview",
  Developer: "/playground",
  Employee: "/playground",
  Auditor: "/overview",
};

export function normalizeRoute(pathname: string): AppRoute | null {
  const route = roleAccess.Admin.find(
    (allowedRoute) => pathname === allowedRoute || pathname.startsWith(`${allowedRoute}/`),
  );
  return route ?? null;
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const route = normalizeRoute(pathname);
  return !route || roleAccess[role].includes(route);
}

export function canMutatePolicies(role: UserRole): boolean {
  return role === "Admin" || role === "Security Analyst";
}
