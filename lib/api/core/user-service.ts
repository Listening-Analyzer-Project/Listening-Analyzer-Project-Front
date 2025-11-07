import { FUser } from '@/types'
import apiClient from '../api-clients'

export const userService = {
  fetchAll: (opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser[]>('/api/users', { cache: true, signal: opts?.signal }),

  fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser>('/api/users/byId', { query: { id }, signal: opts?.signal }),

  search: (q: string, opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser[]>('/api/users', { query: { q }, signal: opts?.signal }),

  create: async (payload: Partial<FUser>) => {
    const result = await apiClient.post<FUser>('/api/users', payload)
    apiClient.invalidateCache('/api/users')
    return result
  },

  update: async (id: string | number, payload: Partial<FUser>) => {
    const result = await apiClient.put<FUser>(`/api/users?id=${id}`, payload)
    apiClient.invalidateCache('/api/users')
    return result
  },

  remove: async (id: string | number) => {
    await apiClient.delete<void>(`/api/users?id=${id}`)
    apiClient.invalidateCache('/api/users')
  },
}

export default userService
