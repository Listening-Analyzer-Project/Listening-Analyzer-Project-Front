import { CanonicalListen } from '@/types/imports-types'
import { normalizeDate } from '../../format-date'


export function parseDeezerListen(input: any): CanonicalListen | null {
  if (!input) return null

  // Extract fields using the keys from the raw Excel export
  const title = (input['Song Title'] ?? '').toString().trim()
  const artistsName = (input['Artist'] ?? '').toString().trim()

  if (!title || !artistsName) return null
  const artists: any = artistsName.split(',').map((artistName: string) => ({ name: artistName.trim() }))

  const date = normalizeDate(input['Date'])
  const listeningTimeMs = parseListeningTimeToMs(input['Listening Time'])

  const albumTitle = (input['Album Title'] ?? '').toString().trim()
  const album = albumTitle ? { title: albumTitle } : undefined

  const platform = (input['Platform Name'] ?? 'unknown').toString()

  const canonical: CanonicalListen = {
    ts: date || new Date().toISOString(),
    platform,
    ms_played: listeningTimeMs,
    track: {
      title,
      ...(album ? { album } : {}),
      artists: artists,
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
