/**
 * Centralized frontend API layer.
 *
 * Every service function in this folder routes through here. In mock mode the
 * caller supplies a mock factory; when VITE_USE_MOCK_API=false the same call is
 * issued as an HTTP request against the Python FastAPI backend.
 *
 * Swapping to the real backend requires NO component changes.
 */

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://127.0.0.1:8000";

export const USE_MOCK_API =
  ((import.meta.env["VITE_USE_MOCK_API"] as string | undefined) ?? "true") !== "false";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REQUEST_TIMEOUT_MS = 10000;
const STORAGE_KEY = "sentinelai.session";

export interface RequestOptions<T> {
  /** Backend path, e.g. "/api/v1/metrics/summary" */
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Mock data used while USE_MOCK_API is true. */
  mock: () => T | Promise<T>;
  /** Artificial latency for realistic loading states. */
  mockDelayMs?: number;
}

function buildUrl(path: string, query?: RequestOptions<unknown>["query"]) {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function getStoredToken() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

async function parseErrorMessage(res: Response) {
  try {
    const body = (await res.json()) as { detail?: unknown; message?: string };
    if (typeof body.message === "string") return body.message;
    if (typeof body.detail === "string") return body.detail;
    if (body.detail && typeof body.detail === "object" && "message" in body.detail) {
      return String((body.detail as { message: unknown }).message);
    }
  } catch {
    // Keep the generic status message below.
  }
  return `Request failed with status ${res.status}`;
}

export async function request<T>(options: RequestOptions<T>): Promise<T> {
  if (USE_MOCK_API) {
    await delay(options.mockDelayMs ?? 320);
    return options.mock();
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getStoredToken();

  const res = await fetch(buildUrl(options.path, options.query), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : null,
    signal: controller.signal,
  })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("Security gateway request timed out.", 408);
      }
      throw new ApiError("Security gateway backend is unavailable.", 503);
    })
    .finally(() => globalThis.clearTimeout(timeout));

  if (res.status === 401) throw new ApiError("Unauthorized. Please sign in again.", 401);
  if (res.status === 429) throw new ApiError("Rate limit exceeded. Try again shortly.", 429);
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);

  return (await res.json()) as T;
}

export const apiEndpoints = {
  health: "/health",
  chat: "/api/v1/chat",
  analyze: "/api/v1/analyze",
  metricsSummary: "/api/v1/metrics/summary",
  securityEvents: "/api/v1/security/events",
  audit: "/api/v1/audit",
  policies: "/api/v1/policies",
  users: "/api/v1/users",
  models: "/api/v1/models",
  settings: "/api/v1/settings",
  notifications: "/api/v1/notifications",
} as const;
