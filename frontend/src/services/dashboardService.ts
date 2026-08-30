import { apiEndpoints, DASHBOARD_REQUEST_TIMEOUT_MS, request, USE_MOCK_API } from "./api";
import {
  eventFromBackend,
  mapMetrics,
  type BackendMetrics,
  type BackendSecurityEvent,
} from "./backendMappers";
import {
  mockAnalytics,
  mockDashboardMetrics,
  mockDecisionBreakdown,
  mockSecurityEvents,
  mockSecurityPosture,
  mockThreatCategories,
  mockTraffic24h,
  mockTraffic30d,
  mockTraffic7d,
} from "@/data/mockData";
import type {
  AnalyticsBundle,
  DashboardMetrics,
  DecisionBreakdown,
  SecurityEvent,
  SecurityPosture,
  ThreatCategory,
  TrafficPoint,
} from "@/types";

export type TimeRange = "24h" | "7d" | "30d" | "90d";

const DASHBOARD_CACHE_TTL_MS = 45000;
const rangeMultiplier: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 6.2,
  "30d": 24.4,
  "90d": 68,
};

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
let cacheScope = "signed-out";

export interface OverviewDashboardData {
  metrics: DashboardMetrics;
  decisions: DecisionBreakdown[];
  threats: ThreatCategory[];
}

export interface OverviewData extends OverviewDashboardData {
  posture: SecurityPosture;
  traffic: TrafficPoint[];
  events: SecurityEvent[];
}

interface BackendOverviewData {
  summary: BackendMetrics;
  posture: SecurityPosture;
  traffic: TrafficPoint[];
  security_events: BackendSecurityEvent[];
}

export function setDashboardCacheScope(userId: string | null): void {
  const nextScope = userId ?? "signed-out";
  if (nextScope === cacheScope) return;
  cacheScope = nextScope;
  clearDashboardCache();
}

export function clearDashboardCache(): void {
  cache.clear();
  inflight.clear();
}

function scopedKey(key: string): string {
  return `${cacheScope}:${key}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): T {
  if (key.startsWith(`${cacheScope}:`)) {
    cache.set(key, { value, expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS });
  }
  return value;
}

function dedupe<T>(key: string, load: () => Promise<T>): Promise<T> {
  const active = inflight.get(key);
  if (active) return active as Promise<T>;
  const promise = load().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

function mockTrafficForRange(range: TimeRange): TrafficPoint[] {
  if (range === "24h") return mockTraffic24h;
  if (range === "7d") return mockTraffic7d;
  return mockTraffic30d;
}

function mockSummaryForRange(range: TimeRange): DashboardMetrics {
  const m = rangeMultiplier[range];
  const scale = (v: number) => Math.round(v * m);
  return {
    ...mockDashboardMetrics,
    totalRequests: scale(mockDashboardMetrics.totalRequests),
    allowedRequests: scale(mockDashboardMetrics.allowedRequests),
    redactedRequests: scale(mockDashboardMetrics.redactedRequests),
    blockedThreats: scale(mockDashboardMetrics.blockedThreats),
    piiDetections: scale(mockDashboardMetrics.piiDetections),
    injectionAttempts: scale(mockDashboardMetrics.injectionAttempts),
  };
}

function decisionBreakdownFromBackendMetrics(metrics: BackendMetrics): DecisionBreakdown[] {
  const total = Math.max(1, metrics.total_requests);
  return [
    { decision: "Allowed", value: Math.round((metrics.allowed_requests / total) * 100) },
    { decision: "Redacted", value: Math.round((metrics.redacted_requests / total) * 100) },
    { decision: "Blocked", value: Math.round((metrics.blocked_requests / total) * 100) },
  ];
}

function threatCategoriesFromBackendMetrics(metrics: BackendMetrics): ThreatCategory[] {
  return [
    { category: "PII Exposure", count: metrics.pii_detections },
    { category: "Secret Detection", count: metrics.secret_detections },
    { category: "Prompt Injection", count: metrics.prompt_injection_attempts },
  ];
}

export function getCachedOverviewData(range: TimeRange = "24h"): OverviewData | null {
  return getCached<OverviewData>(scopedKey(`overview:${range}`));
}

export async function getOverviewData(range: TimeRange = "24h"): Promise<OverviewData> {
  const key = scopedKey(`overview:${range}`);
  const cached = getCached<OverviewData>(key);
  if (cached) return cached;
  return dedupe(key, async () => {
    if (USE_MOCK_API) {
      return setCached(
        key,
        await request<OverviewData>({
          path: apiEndpoints.metricsOverview,
          query: { range },
          mock: () => ({
            metrics: mockSummaryForRange(range),
            decisions: mockDecisionBreakdown,
            threats: mockThreatCategories,
            posture: mockSecurityPosture,
            traffic: mockTrafficForRange(range),
            events: mockSecurityEvents.slice(0, 6),
          }),
        }),
      );
    }

    const overview = await request<BackendOverviewData>({
      path: apiEndpoints.metricsOverview,
      query: { range },
      mock: () => ({
        summary: mockDashboardMetrics as unknown as BackendMetrics,
        posture: mockSecurityPosture,
        traffic: [],
        security_events: [],
      }),
      timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
    });

    return setCached(key, {
      metrics: mapMetrics(overview.summary),
      decisions: decisionBreakdownFromBackendMetrics(overview.summary),
      threats: threatCategoriesFromBackendMetrics(overview.summary),
      posture: overview.posture,
      traffic: overview.traffic,
      events: overview.security_events.map(eventFromBackend),
    });
  });
}

export async function getOverviewDashboardData(
  range: TimeRange = "24h",
): Promise<OverviewDashboardData> {
  const overview = await getOverviewData(range);
  return {
    metrics: overview.metrics,
    decisions: overview.decisions,
    threats: overview.threats,
  };
}

export async function getDashboardSummary(range: TimeRange = "24h"): Promise<DashboardMetrics> {
  const key = scopedKey(`summary:${range}`);
  const cached = getCached<DashboardMetrics>(key);
  if (cached) return cached;
  if (USE_MOCK_API) {
    return dedupe(key, () =>
      request<DashboardMetrics>({
        path: apiEndpoints.metricsSummary,
        query: { range },
        mock: () => setCached(key, mockSummaryForRange(range)),
      }),
    );
  }

  return dedupe(key, async () => {
    const metrics = await request<BackendMetrics>({
      path: apiEndpoints.metricsSummary,
      query: { range },
      mock: () => mockDashboardMetrics as unknown as BackendMetrics,
      timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
    });
    return setCached(key, mapMetrics(metrics));
  });
}

export async function getSecurityPosture(): Promise<SecurityPosture> {
  const key = scopedKey("posture");
  const cached = getCached<SecurityPosture>(key);
  if (cached) return cached;
  if (USE_MOCK_API) {
    return dedupe(key, () =>
      request<SecurityPosture>({
        path: apiEndpoints.metricsPosture,
        mock: () => setCached(key, mockSecurityPosture),
      }),
    );
  }

  return dedupe(key, async () =>
    setCached(
      key,
      await request<SecurityPosture>({
        path: apiEndpoints.metricsPosture,
        mock: () => mockSecurityPosture,
        timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
      }),
    ),
  );
}

export async function getTrafficSeries(range: TimeRange = "24h"): Promise<TrafficPoint[]> {
  const key = scopedKey(`traffic:${range}`);
  const cached = getCached<TrafficPoint[]>(key);
  if (cached) return cached;
  const mock = () => mockTrafficForRange(range);
  if (USE_MOCK_API) {
    return dedupe(key, () =>
      request<TrafficPoint[]>({
        path: apiEndpoints.metricsTraffic,
        query: { range },
        mock: () => setCached(key, mock()),
      }),
    );
  }

  return dedupe(key, async () =>
    setCached(
      key,
      await request<TrafficPoint[]>({
        path: apiEndpoints.metricsTraffic,
        query: { range },
        mock,
        timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
      }),
    ),
  );
}

export async function getDecisionBreakdown(): Promise<DecisionBreakdown[]> {
  if (USE_MOCK_API) {
    return request<DecisionBreakdown[]>({
      path: `${apiEndpoints.metricsSummary}/decisions`,
      mock: () => mockDecisionBreakdown,
    });
  }
  const metrics = await request<BackendMetrics>({
    path: apiEndpoints.metricsSummary,
    mock: () => mockDashboardMetrics as unknown as BackendMetrics,
    timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
  });
  return decisionBreakdownFromBackendMetrics(metrics);
}

export async function getThreatCategories(): Promise<ThreatCategory[]> {
  if (USE_MOCK_API) {
    return request<ThreatCategory[]>({
      path: `${apiEndpoints.metricsSummary}/threats`,
      mock: () => mockThreatCategories,
    });
  }
  const metrics = await request<BackendMetrics>({
    path: apiEndpoints.metricsSummary,
    mock: () => mockDashboardMetrics as unknown as BackendMetrics,
    timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
  });
  return threatCategoriesFromBackendMetrics(metrics);
}

export async function getAnalytics(range: TimeRange = "7d"): Promise<AnalyticsBundle> {
  const mock = () => rangeAnalytics(range);
  return USE_MOCK_API
    ? request<AnalyticsBundle>({
        path: apiEndpoints.metricsAnalytics,
        query: { range },
        mock,
      })
    : request<AnalyticsBundle>({
        path: apiEndpoints.metricsAnalytics,
        query: { range },
        mock,
        timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
      });
}

function rangeAnalytics(range: TimeRange): AnalyticsBundle {
  const requestVolume =
    range === "24h"
      ? mockTraffic24h
      : range === "7d"
        ? mockTraffic7d
        : range === "30d"
          ? mockTraffic30d
          : mockTraffic30d.map((point, index) => ({
              ...point,
              label: `W${index + 1}`,
              total: Math.round(point.total * 2.8),
              allowed: Math.round(point.allowed * 2.8),
              blocked: Math.round(point.blocked * 2.8),
            }));
  const factor = range === "24h" ? 0.18 : range === "7d" ? 1 : range === "30d" ? 3.7 : 10.5;
  const scale = (value: number) => Math.max(0, Math.round(value * factor));
  const suffix = range === "24h" ? "h" : range === "90d" ? "w" : "";

  return {
    ...mockAnalytics,
    requestVolume,
    threatTrends: mockAnalytics.threatTrends.map((point, index) => ({
      label: suffix ? `${index + 1}${suffix}` : point.label,
      injection: scale(point.injection),
      pii: scale(point.pii),
      secrets: scale(point.secrets),
    })),
    piiCategories: mockAnalytics.piiCategories.map((item) => ({
      ...item,
      count: scale(item.count),
    })),
    modelUsage: mockAnalytics.modelUsage.map((item) => ({ ...item, count: scale(item.count) })),
    departmentUsage: mockAnalytics.departmentUsage.map((item) => ({
      ...item,
      count: scale(item.count),
    })),
    blockedVsAllowed: mockAnalytics.blockedVsAllowed.map((item) => ({
      ...item,
      value: scale(item.value),
    })),
    riskDistribution: mockAnalytics.riskDistribution.map((item) => ({
      ...item,
      count: scale(item.count),
    })),
    latencyTrend: mockAnalytics.latencyTrend.map((point, index) => ({
      label: suffix ? `${index + 1}${suffix}` : point.label,
      latency: Math.round(point.latency * (range === "24h" ? 0.92 : range === "90d" ? 1.08 : 1)),
    })),
  };
}
