import { ArtistType, CanonicalListen } from '@/types/imports-types'
import { normalizeDate } from '../../format-date'


export function validateCanonicalListen(raw: unknown): CanonicalListen | null {
  if (raw === null || typeof raw !== 'object') return null

  const r = raw as any

  const ts = normalizeDate(r.ts)
  if (!ts) return null

  const ms = Number(r.ms_played)
  if (!Number.isFinite(ms) || ms < 0) return null

  if (!r.track || typeof r.track !== 'object') return null

  const title = String(r.track.title ?? '').trim()
  if (!title) return null

  if (!Array.isArray(r.track.artists) || r.track.artists.length === 0) return null

  const artists: ArtistType[] = r.track.artists.map((a: unknown) => {
    const ai = a === null || typeof a !== 'object' ? {} : (a as any)
    const name = String(ai.name ?? '').trim()
    return { ...(ai || {}), name } as ArtistType
  })

  if (artists.some((a: ArtistType) => !a.name)) return null

  const canonical: CanonicalListen = {
    ...(r as CanonicalListen),
    ts,
    ms_played: ms,
    track: {
      ...r.track,
      title,
      artists,
    },
  }

  return canonical
}
