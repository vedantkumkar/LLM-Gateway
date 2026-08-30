import { apiEndpoints, request, USE_MOCK_API } from "./api";
import {
  mapHealth,
  mapMetrics,
  notificationFromBackend,
  type BackendHealth,
  type BackendMetrics,
  type BackendNotification,
} from "./backendMappers";
import { mockNotifications, mockSettings, mockSystemHealth } from "@/data/mockData";
import type { AppNotification, GatewaySettings, SystemHealth } from "@/types";

export async function getSystemHealth(): Promise<SystemHealth> {
  if (USE_MOCK_API) {
    return request<SystemHealth>({
      path: `${apiEndpoints.health}/detailed`,
      mock: () => mockSystemHealth,
    });
  }
  const [health, metrics] = await Promise.all([
    request<BackendHealth>({
      path: apiEndpoints.health,
      mock: () => ({}) as BackendHealth,
    }),
    request<BackendMetrics>({
      path: apiEndpoints.metricsSummary,
      mock: () => ({}) as BackendMetrics,
    }).catch(() => null),
  ]);
  return mapHealth(health, metrics ? mapMetrics(metrics) : undefined);
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (USE_MOCK_API) {
    return request<AppNotification[]>({
      path: apiEndpoints.notifications,
      mockDelayMs: 180,
      mock: () => mockNotifications,
    });
  }
  const notifications = await request<BackendNotification[]>({
    path: apiEndpoints.notifications,
    mock: () => [] as BackendNotification[],
  });
  return notifications.map(notificationFromBackend);
}

let settings: GatewaySettings = structuredClone(mockSettings);

export async function getSettings(): Promise<GatewaySettings> {
  return request<GatewaySettings>({
    path: apiEndpoints.settings,
    mock: () => structuredClone(settings),
  });
}

export async function updateSettings(next: GatewaySettings): Promise<GatewaySettings> {
  return request<GatewaySettings>({
    path: apiEndpoints.settings,
    method: "PUT",
    body: next,
    mockDelayMs: 400,
    mock: () => {
      settings = structuredClone(next);
      return structuredClone(settings);
    },
  });
}

export async function resetSettings(): Promise<GatewaySettings> {
  settings = structuredClone(mockSettings);
  return structuredClone(settings);
}
