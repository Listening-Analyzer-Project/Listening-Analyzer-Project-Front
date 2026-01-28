
import {
    BASE_COLOR_HEX,
    DEFAULT_COLOR,
    EQU_DIST_COUNT,
    LUMINANCE_PRESET,
    TAG_COLORS
} from '@/lib/constants/colors-constants'
import {
    generateLuminancePalette,
    getCyclicColor,
} from '@/lib/utils'
import { isGroup, isItem } from '@/lib/utils/core-service'
import { FGenreWithSubGenres, FTag, FUser, ViewState } from '@/types'

/**
 * GENERATOR: Users & Groups
 * -----------------------------------------------------------------
 */
export function buildUserColorMap(
    viewState: ViewState,
    usersById: Map<number, FUser>,
    baseColor: string = BASE_COLOR_HEX,
    count: number = EQU_DIST_COUNT,
    preset = LUMINANCE_PRESET
): Map<string, string> {
    const colorMap = new Map<string, string>()
    let colorIndex = 0

    const assignColorsToItems = (itemIds: string[]) => {
        for (const id of itemIds) {
            const item = viewState.items[id]
            if (!item) continue

            if (isGroup(item)) {
                // Group gets new color
                const groupColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
                // Use group NAME as key if available
                if (item.name) {
                    colorMap.set(item.name, groupColor)
                }
                // Recurse for children
                assignColorsToItems(item.children)
            } else if (isItem(item)) {
                // Users and aliases share the same color based on userId
                const user = usersById.get(item.userId)
                
                if (user && user.name) {
                    // Check if we already assigned a color to this user name
                    let userColor = colorMap.get(user.name)

                    if (!userColor) {
                        userColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
                        colorMap.set(user.name, userColor)
                    }
                }
            }
        }
    }

    assignColorsToItems(viewState.order)
    return colorMap
}

/**
 * GENERATOR: Tags
 * -----------------------------------------------------------------
 */
export function getTagGroupColor(index: number): string {
    if (index === 0) return DEFAULT_COLOR
    if (index <= 10) return TAG_COLORS[index] || DEFAULT_COLOR

    // Cycle for index > 10
    const cycleIndex = (index - 11) % 10
    return TAG_COLORS[cycleIndex + 1] || DEFAULT_COLOR
}

export function buildTagColorMap(
    groupedTags: Map<number, FTag[]>
): Map<string, string> {
    const colorMap = new Map<string, string>()

    groupedTags.forEach((tags, colorIndex) => {
        const baseColor = getTagGroupColor(colorIndex)

        // Generate palette from base color
        const luminancePalette = generateLuminancePalette(baseColor, 'lightColorsList')
        const luminanceColors = Object.values(luminancePalette)

        tags.forEach((tag, tagIndex) => {
            if (tag.name) {
                const color = luminanceColors[tagIndex % luminanceColors.length]
                colorMap.set(tag.name, color)
            }
        })
    })

    return colorMap
}

/**
 * GENERATOR: Genres
 * -----------------------------------------------------------------
 */
export function buildGenreColorMap(
    genres: FGenreWithSubGenres[],
    baseColor: string = BASE_COLOR_HEX,
    count: number = EQU_DIST_COUNT,
    preset = LUMINANCE_PRESET
): { genreColors: Map<string, string>; subGenreColors: Map<number, string> } {
    const genreColors = new Map<string, string>()
    const subGenreColors = new Map<number, string>()
    
    if (genres.length === 0) return { genreColors, subGenreColors }

    genres.forEach((genre, genreIndex) => {
        const genreColor = getCyclicColor(baseColor, count, preset, genreIndex + 1)
        
        if (genre.name) {
             genreColors.set(genre.name, genreColor)
        }

        const luminancePalette = generateLuminancePalette(genreColor, 'lightColorsList')
        const luminanceColors = Object.values(luminancePalette)

        if (genre.sub_genres) {
            genre.sub_genres.forEach((sub, subIndex) => {
                if (sub.id) {
                    const color = luminanceColors[subIndex % luminanceColors.length]
                    subGenreColors.set(sub.id, color)
                }
            })
        }
    })

    return { genreColors, subGenreColors }
}
