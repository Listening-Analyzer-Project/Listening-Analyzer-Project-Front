
import { create } from 'zustand'

import { FGenreWithSubGenres, FTag, FUser, ViewState } from '@/types'
import {
    buildGenreColorMap,
    buildTagColorMap,
    buildUserColorMap
} from './colors-generators'

interface ColorState {
    userColors: Map<string, string> // Key: User Name or Group Name
    tagColors: Map<string, string>  // Key: Tag Name
    genreColors: Map<string, string> // Key: Genre Name
    subGenreColors: Map<number, string> // Key: SubGenre ID

    syncUserColors: (viewState: ViewState, usersById: Map<number, FUser>) => void
    syncTagColors: (groupedTags: Map<number, FTag[]>) => void
    syncGenreColors: (genres: FGenreWithSubGenres[]) => void

    getUserColor: (name: string) => string | undefined
    getTagColor: (name: string) => string | undefined
    getGenreColor: (name: string) => string | undefined
    getSubGenreColor: (id: number) => string | undefined
}

export const useColorStore = create<ColorState>((set, get) => ({
    userColors: new Map(),
    tagColors: new Map(),
    genreColors: new Map(),
    subGenreColors: new Map(),

    syncUserColors: (viewState: ViewState, usersById: Map<number, FUser>) => {
        const newMap = buildUserColorMap(viewState, usersById)
        set({ userColors: newMap })
    },

    syncTagColors: (groupedTags: Map<number, FTag[]>) => {
        const newMap = buildTagColorMap(groupedTags)
        set({ tagColors: newMap })
    },

    syncGenreColors: (genres: FGenreWithSubGenres[]) => {
        const { genreColors, subGenreColors } = buildGenreColorMap(genres)
        set({ genreColors, subGenreColors })
    },

    getUserColor: (name: string) => get().userColors.get(name),
    getTagColor: (name: string) => get().tagColors.get(name),
    getGenreColor: (name: string) => get().genreColors.get(name),
    getSubGenreColor: (id: number) => get().subGenreColors.get(id),
}))
