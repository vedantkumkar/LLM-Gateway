import { apiEndpoints, request, USE_MOCK_API } from "./api";
import { mapMetrics, type BackendMetrics } from "./backendMappers";
import {
  mockAnalytics,
  mockDashboardMetrics,
  mockDecisionBreakdown,
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
  SecurityPosture,
  ThreatCategory,
  TrafficPoint,
} from "@/types";

export type TimeRange = "24h" | "7d" | "30d" | "90d";

const rangeMultiplier: Record<TimeRange, number> = { "24h": 1, "7d": 6.2, "30d": 24.4, "90d": 68 };

export async function getDashboardSummary(range: TimeRange = "24h"): Promise<DashboardMetrics> {
  if (USE_MOCK_API) {
    return request<DashboardMetrics>({
      path: apiEndpoints.metricsSummary,
      query: { range },
      mock: () => {
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
      },
    });
  }
  const metrics = await request<BackendMetrics>({
    path: apiEndpoints.metricsSummary,
    query: { range },
    mock: () => mockDashboardMetrics as unknown as BackendMetrics,
  });
  return mapMetrics(metrics);
}

export async function getSecurityPosture(): Promise<SecurityPosture> {
  return USE_MOCK_API
    ? request<SecurityPosture>({
        path: `${apiEndpoints.metricsSummary}/posture`,
        mock: () => mockSecurityPosture,
      })
    : mockSecurityPosture;
}

export async function getTrafficSeries(range: TimeRange = "24h"): Promise<TrafficPoint[]> {
  const mock = () => (range === "24h" ? mockTraffic24h : range === "7d" ? mockTraffic7d : mockTraffic30d);
  return USE_MOCK_API
    ? request<TrafficPoint[]>({ path: `${apiEndpoints.metricsSummary}/traffic`, query: { range }, mock })
    : mock();
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
  });
  const total = Math.max(1, metrics.total_requests);
  return [
    { decision: "Allowed", value: Math.round((metrics.allowed_requests / total) * 100) },
    { decision: "Redacted", value: Math.round((metrics.redacted_requests / total) * 100) },
    { decision: "Blocked", value: Math.round((metrics.blocked_requests / total) * 100) },
  ];
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
  });
  return [
    { category: "PII Exposure", count: metrics.pii_detections },
    { category: "Secret Detection", count: metrics.secret_detections },
    { category: "Prompt Injection", count: metrics.prompt_injection_attempts },
  ];
}

export async function getAnalytics(range: TimeRange = "7d"): Promise<AnalyticsBundle> {
  const mock = () => rangeAnalytics(range);
  return USE_MOCK_API
    ? request<AnalyticsBundle>({ path: `${apiEndpoints.metricsSummary}/analytics`, query: { range }, mock })
    : mock();
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
    piiCategories: mockAnalytics.piiCategories.map((item) => ({ ...item, count: scale(item.count) })),
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
