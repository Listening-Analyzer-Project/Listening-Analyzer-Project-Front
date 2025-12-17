import { EventParams, FEvent, FEventWithCategory } from "@/types";
import { apiClient } from "../api-clients";

export const eventEndpoint = {
    fetchAll: (opts?: { signal?: AbortSignal }) =>
      apiClient.get<FEvent[]>('/api/events', { cache: true, signal: opts?.signal }),

    fetchAllWithCategory: (params: EventParams) =>
      apiClient.get<FEventWithCategory[]>('/api/events/withCategory', { query: params as any }),
    
    fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FEvent>('/api/events/byId', { query: { id }, signal: opts?.signal }),
    
    search: (q: string, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FEvent[]>('/api/events', { query: { q }, signal: opts?.signal }),
    
    create: async (payload: Partial<FEvent>) => {
      const result = await apiClient.post<FEvent>('/api/events', payload)
      apiClient.invalidateCache('/api/events')
      return result
    },
    
    update: async (id: string | number, payload: Partial<FEvent>) => {
      const result = await apiClient.put<FEvent>(`/api/events?id=${id}`, payload)
      apiClient.invalidateCache('/api/events')
      return result
    },
    
    remove: async (id: string | number, payload?: Partial<FEvent>) => {
      const result = await apiClient.delete<void>(`/api/events?id=${id}`, payload)
      apiClient.invalidateCache('/api/events')
      return result
    },
}

export default eventEndpoint