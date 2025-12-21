import { generateLuminancePalette, getCyclicColor, LuminancePreset } from '@/lib/utils'
import { FGenreWithSubGenres } from '@/types'

/**
 * @param genres - List of genres with their sub-genres (already sorted in display order)
 * @param baseColor - Base color to start the hue cycle (default: '#16A34A')
 * @param count - Number of hue variants (default: 8)
 * @param preset - Luminance preset for genre hue cycle (default: 'shortlist')
 * @returns Map of sub-genre IDs to color strings
 */
export function buildGenreColorMap(
  genres: FGenreWithSubGenres[],
  baseColor: string = '#16A34A',
  count: number = 8,
  preset: LuminancePreset = 'shortList'
): Map<number, string> {
  const colorMap = new Map<number, string>()
  if (genres.length === 0) return colorMap

  genres.forEach((genre, genreIndex) => {
    const genreColor = getCyclicColor(baseColor, count, preset, genreIndex + 1)
    
    const luminancePalette = generateLuminancePalette(genreColor, 'lightColorsList')
    const luminanceColors = Object.values(luminancePalette)
    
    if (genre.sub_genres) {
      genre.sub_genres.forEach((sub, subIndex) => {
        if (sub.id) {
          const color = luminanceColors[subIndex % luminanceColors.length]
          colorMap.set(sub.id, color)
        }
      })
    }
  })

  return colorMap
}
