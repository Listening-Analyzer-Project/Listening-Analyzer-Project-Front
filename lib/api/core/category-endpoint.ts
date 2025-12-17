import { FCategory } from "@/types";
import { apiClient } from "../api-clients";

export const categoryEndpoint = {
    fetchAll: (opts?: { signal?: AbortSignal }) =>
      apiClient.get<FCategory[]>('/api/categories', { cache: true, signal: opts?.signal }),
    
    fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FCategory>('/api/categories/byId', { query: { id }, signal: opts?.signal }),
    
    search: (q: string, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FCategory[]>('/api/categories', { query: { q }, signal: opts?.signal }),
    
    create: async (payload: Partial<FCategory>) => {
      const result = await apiClient.post<FCategory>('/api/categories', payload)
      apiClient.invalidateCache('/api/categories')
      return result
    },
    
    update: async (id: string | number, payload: Partial<FCategory>) => {
      const result = await apiClient.put<FCategory>(`/api/categories?id=${id}`, payload)
      apiClient.invalidateCache('/api/categories')
      return result
    },
    
    remove: async (id: string | number, payload: Partial<FCategory>) => {
      const result = await apiClient.delete<void>(`/api/categories?id=${id}`, payload)
      apiClient.invalidateCache('/api/categories')
      return result
    },
}

export default categoryEndpoint