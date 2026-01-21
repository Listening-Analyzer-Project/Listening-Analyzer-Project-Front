'use client'

import { useEffect, useMemo } from 'react'

import { genreEndpoint } from '@/lib/api/core/genre-endpoint'
import { tagEndpoint } from '@/lib/api/core/tag-endpoints'
import { userEndpoint } from '@/lib/api/core/user-endpoint'
import { useApi } from '@/lib/hooks'
import { useColorStore } from '@/lib/store/colors/colors-store'
import { useUsersStore } from '@/lib/store/users/users-store'
import {
  SYNC_GENRES_EVENT,
  SYNC_TAGS_EVENT,
  SYNC_USER_EVENT
} from '@/lib/sync-signals'
import type { FGenreWithSubGenres, FTag, FUser } from '@/types'

export default function DataSynchronizer() {
  const { syncUserColors, syncTagColors, syncGenreColors } = useColorStore()
  const { viewState } = useUsersStore()

  // --- Users Fetching ---
  const { data: users, refetch: refetchUsers } = useApi<FUser[]>(
    () => userEndpoint.fetchAll(),
    []
  )

  // --- Tags Fetching ---
  const { data: tags, refetch: refetchTags } = useApi<FTag[]>(
    () => tagEndpoint.fetchAll(),
    []
  )

  // --- Genres Fetching ---
  const { data: genres, refetch: refetchGenres } = useApi<FGenreWithSubGenres[]>(
    () => genreEndpoint.fetchWithSubGenres(),
    []
  )

  // --- Sync Logic ---

  // 1. Users
  // We need usersById map for the color generator
  const usersById = useMemo(() => {
    return new Map((users || []).map(u => [u.id!, u]))
  }, [users])

  useEffect(() => {
    if (viewState && users && users.length > 0) {
      syncUserColors(viewState, usersById)
    }
  }, [viewState, users, usersById, syncUserColors])

  // 2. Tags
  useEffect(() => {
    if (tags) {
      // Group tags for the generator
      const groups = new Map<number, FTag[]>()
      tags.forEach(tag => {
        const idx = tag.color_index
        if (!groups.has(idx)) groups.set(idx, [])
        groups.get(idx)?.push(tag)
      })
      syncTagColors(groups)
    }
  }, [tags, syncTagColors])

  // 3. Genres
  useEffect(() => {
    if (genres) {
      syncGenreColors(genres)
    }
  }, [genres, syncGenreColors])


  // --- Event Listeners for Refetch ---
  useEffect(() => {
    const handleUserUpdate = () => refetchUsers()
    const handleTagUpdate = () => refetchTags()
    const handleGenreUpdate = () => refetchGenres()

    window.addEventListener(SYNC_USER_EVENT, handleUserUpdate)
    window.addEventListener(SYNC_TAGS_EVENT, handleTagUpdate)
    window.addEventListener(SYNC_GENRES_EVENT, handleGenreUpdate)

    return () => {
      window.removeEventListener(SYNC_USER_EVENT, handleUserUpdate)
      window.removeEventListener(SYNC_TAGS_EVENT, handleTagUpdate)
      window.removeEventListener(SYNC_GENRES_EVENT, handleGenreUpdate)
    }
  }, [refetchUsers, refetchTags, refetchGenres])

  return null // This component does not render anything
}
