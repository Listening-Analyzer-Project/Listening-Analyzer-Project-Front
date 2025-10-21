import { normalizeDate } from '../services/date-service'
import { CanonicalListen, DeezerListen } from '../types/listen-types'

export function parseDeezerListen(input: DeezerListen): CanonicalListen | null {
  if (!input) return null

  // Required fields validation
  const title = (input.title ?? '').toString().trim()
  const artistName = (input.artist ?? '').toString().trim()
  if (!title || !artistName) return null

  // Normalize date and listening time using shared utilities
  const date = normalizeDate(input.date)
  const listeningTimeMs = parseListeningTimeToMs(input.listening_time)

  // Optional fields with proper defaults
  const albumTitle = (input.album ?? '').toString().trim()
  const album = albumTitle ? { title: albumTitle } : undefined

  const platform = (input.platform_name ?? 'unknown').toString()

  // Build canonical object
  const canonical: CanonicalListen = {
    ts: date || new Date().toISOString(),
    platform,
    ms_played: listeningTimeMs,
    track: {
      title,
      ...(album ? { album } : {}),
      artists: [{ name: artistName }],
      tags: [],
    },
  }

  return canonical
}

// Convert listening time in seconds (as from Deezer) to milliseconds
export function parseListeningTimeToMs(value: any): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(value)
  if (isNaN(n) || n < 0) return 0
  return Math.round(n * 1000)
}
