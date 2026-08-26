import { apiEndpoints, request, USE_MOCK_API } from "./api";
import { mapModel, type BackendModel } from "./backendMappers";
import { mockModels } from "@/data/mockData";
import type { AIModel } from "@/types";

export async function getModels(): Promise<AIModel[]> {
  if (USE_MOCK_API) {
    return request<AIModel[]>({
      path: apiEndpoints.models,
      mock: () => mockModels.map((m) => ({ ...m })),
    });
  }
  const models = await request<BackendModel[]>({
    path: apiEndpoints.models,
    mock: () => [] as BackendModel[],
  });
  return models.map(mapModel);
}
