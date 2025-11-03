import { FUser } from '@/types'
import apiClient from '../api-clients'

export const userService = {
  fetchAll: (opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser[]>('/api/users', { cache: true, signal: opts?.signal }),

  fetchById: (id: string | number, opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser>('/api/users/byId', { query: { id }, signal: opts?.signal }),

  search: (q: string, opts?: { signal?: AbortSignal }) =>
    apiClient.get<FUser[]>('/api/users', { query: { q }, signal: opts?.signal }),

  create: (payload: Partial<FUser>) => apiClient.post<FUser>('/api/users', payload),

  update: (id: string | number, payload: Partial<FUser>) =>
    apiClient.patch<FUser>(`/api/users/${id}`, payload),

  remove: (id: string | number) => apiClient.delete<void>(`/api/users/${id}`),
}

export default userService
