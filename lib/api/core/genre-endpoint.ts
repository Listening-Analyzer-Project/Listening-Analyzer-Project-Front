import { FGenre, FGenreWithSubGenres } from "@/types";
import { apiClient } from "../api-clients";

export const genreEndpoint = {
    fetchAll: (opts?: { signal?: AbortSignal }) =>
      apiClient.get<FGenre[]>('/api/genres', { cache: true, signal: opts?.signal }),

    fetchWithSubGenres: (opts?: { signal?: AbortSignal }) =>
      apiClient.get<FGenreWithSubGenres[]>('/api/genres/withSubGenres', { cache: true, signal: opts?.signal }),
    
    fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
      apiClient.get<FGenre>('/api/genres/byId', { query: { id }, signal: opts?.signal }),
    
    create: async (payload: Partial<FGenre>) => {
      const result = await apiClient.post<FGenre>('/api/genres', payload)
      apiClient.invalidateCache('/api/genres')
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
    
    update: async (id: string | number, payload: Partial<FGenre>) => {
      const result = await apiClient.put<FGenre>(`/api/genres?id=${id}`, payload)
      apiClient.invalidateCache('/api/genres')
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
    
    remove: async (id: string | number, payload: Partial<FGenre>) => {
      const result = await apiClient.delete<void>(`/api/genres?id=${id}`, payload)
      apiClient.invalidateCache('/api/genres')
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
}

export default genreEndpoint;
