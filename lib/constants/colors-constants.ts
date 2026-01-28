
/**
 * Configuration for application colors.
 * This file contains hardcoded values and presets used for color generation.
 */

// Base color for users/groups
export const BASE_COLOR_HEX = '#16A34A'


// Default color (e.g., used for index 0 or fallback)
export const DEFAULT_COLOR = '#6B7280'

// Configuration for equidistant generation
export const EQU_DIST_COUNT = 8
export const LUMINANCE_PRESET = 'shortList' as const

// Hardcoded colors for Tags (indices 1-10)
export const TAG_COLORS: Record<number, string> = {
    1: '#a1165b', // Rose (Rating)
    2: '#9116a1', // Magenta (Context)
    3: '#3416a1', // Indigo (Vocals)
    4: '#164ba1', // Blue (Mood)
    5: '#16a192', // Cyan (Energy)
    6: '#16a13b', // Green (Style)
    7: '#5fa116', // Lime
    8: '#a19716', // Yellow
    9: '#a15b16', // Orange
    10: '#a11b16', // Red
}
