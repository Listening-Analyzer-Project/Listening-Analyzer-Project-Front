import { FTag } from "@/types";
import { apiClient } from "../api-clients";

export const tagEndpoint = {
    fetchAll: (opts?: { signal?: AbortSignal }) =>
      apiClient.get<FTag[]>('/api/tags', { cache: true, signal: opts?.signal }),
    
    fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FTag>('/api/tags/byId', { query: { id }, signal: opts?.signal }),
    
    create: async (payload: Partial<FTag>) => {
      const result = await apiClient.post<FTag>('/api/tags', payload)
      apiClient.invalidateCache('/api/tags')
      return result
    },
    
    update: async (id: string | number, payload: Partial<FTag>) => {
      const result = await apiClient.put<FTag>(`/api/tags?id=${id}`, payload)
      apiClient.invalidateCache('/api/tags')
      return result
    },
    
    remove: async (id: string | number, payload?: Partial<FTag>) => {
      const result = await apiClient.delete<void>(`/api/tags?id=${id}`, payload)
      apiClient.invalidateCache('/api/tags')
      return result
    },
}

export default tagEndpoint;
