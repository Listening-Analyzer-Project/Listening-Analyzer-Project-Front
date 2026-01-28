import {
    SYNC_GENRES_EVENT,
    SYNC_TAGS_EVENT,
    SYNC_USER_EVENT
} from '@/lib/events/sync-events'
import { useColorStore } from '@/lib/store/colors-store'
import { useUsersStore } from '@/lib/store/users/users-store'

// Imports from API
import { genreEndpoint } from '@/lib/api/core/genre-endpoint'
import { tagEndpoint } from '@/lib/api/core/tag-endpoints'
import { userEndpoint } from '@/lib/api/core/user-endpoint'

import { FTag } from '@/types'

let initialized = false

// Internal Fetch & Sync Logic
async function fetchAndSyncUsers() {
    try {
        const users = await userEndpoint.fetchAll()
        if (!users) return

        const usersById = new Map(users.map(u => [u.id!, u]))
        // We need the ViewState from the users store to correctly assign colors based on grouping/ordering
        const viewState = useUsersStore.getState().viewState
        
        useColorStore.getState().syncUserColors(viewState, usersById)
    } catch (error) {
        console.error("Orchestrator: Failed to fetch users", error)
    }
}

async function fetchAndSyncTags() {
    try {
        const tags = await tagEndpoint.fetchAll()
        if (!tags) return

        const groups = new Map<number, FTag[]>()
        tags.forEach(tag => {
            const idx = tag.color_index
            if (!groups.has(idx)) groups.set(idx, [])
            groups.get(idx)?.push(tag)
        })
        
        useColorStore.getState().syncTagColors(groups)
    } catch (error) {
        console.error("Orchestrator: Failed to fetch tags", error)
    }
}

async function fetchAndSyncGenres() {
    try {
        const genres = await genreEndpoint.fetchWithSubGenres()
        if (!genres) return

        useColorStore.getState().syncGenreColors(genres)
    } catch (error) {
        console.error("Orchestrator: Failed to fetch genres", error)
    }
}

export function initGlobalOrchestrator() {
    if (initialized) return
    initialized = true

    // 1. Initial Fetch
    fetchAndSyncUsers()
    fetchAndSyncTags()
    fetchAndSyncGenres()

    // 2. Event Listeners
    if (typeof window !== 'undefined') {
        window.addEventListener(SYNC_USER_EVENT, () => fetchAndSyncUsers())
        window.addEventListener(SYNC_TAGS_EVENT, () => fetchAndSyncTags())
        window.addEventListener(SYNC_GENRES_EVENT, () => fetchAndSyncGenres())
    }

    // 3. Subscription to UsersStore
    useUsersStore.subscribe((state) => {
         fetchAndSyncUsers()
    })
}
