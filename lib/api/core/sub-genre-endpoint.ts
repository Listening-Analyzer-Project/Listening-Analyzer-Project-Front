import { FSubGenre } from "@/types";
import { apiClient } from "../api-clients";

export const subGenreEndpoint = {
    create: async (payload: Partial<FSubGenre> & { genre_id?: number }) => {
      const result = await apiClient.post<FSubGenre>('/api/sub-genres', payload)
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
    
    update: async (id: string | number, payload: Partial<FSubGenre> & { genre_id?: number }) => {
      const result = await apiClient.put<FSubGenre>(`/api/sub-genres?id=${id}`, payload)
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
    
    remove: async (id: string | number) => {
      const result = await apiClient.delete<void>(`/api/sub-genres?id=${id}`)
      apiClient.invalidateCache('/api/genres/withSubGenres')
      return result
    },
}

export default subGenreEndpoint;
