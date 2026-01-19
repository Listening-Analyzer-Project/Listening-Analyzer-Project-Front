import { generateLuminancePalette } from '@/lib/utils'
import { FTag } from '@/types'

// Placeholder colors for indices 1-10. Index 0 is ignored here.
const TAG_COLORS: Record<number, string> = {
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

const DEFAULT_COLOR = '#6B7280' // Gray for index 0

export function getTagGroupColor(index: number): string {
    if (index === 0) return DEFAULT_COLOR
    if (index <= 10) return TAG_COLORS[index] || DEFAULT_COLOR
    
    // Cycle for index > 10
    const cycleIndex = (index - 11) % 10
    return TAG_COLORS[cycleIndex + 1] || DEFAULT_COLOR
}

/**
 * @param groupedTags - Map of color_index to list of tags
 * @returns Map of tag IDs to color strings
 */
export function buildTagColorMap(
  groupedTags: Map<number, FTag[]>
): Map<number, string> {
  const colorMap = new Map<number, string>()
  
  groupedTags.forEach((tags, colorIndex) => {
    const baseColor = getTagGroupColor(colorIndex)
    
    // Generate palette from base color
    const luminancePalette = generateLuminancePalette(baseColor, 'lightColorsList')
    const luminanceColors = Object.values(luminancePalette)
    
    tags.forEach((tag, tagIndex) => {
        if (tag.id) {
            const color = luminanceColors[tagIndex % luminanceColors.length]
            colorMap.set(tag.id, color)
        }
    })
  })

  return colorMap
}
