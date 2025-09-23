// Utilitaires pour l'import des données Spotify

export interface SpotifyListenData {
  ts: string
  platform: string
  ms_played: number
  conn_country: string
  ip_addr: string | null
  master_metadata_track_name: string | null
  master_metadata_album_artist_name: string | null
  master_metadata_album_album_name: string | null
  spotify_track_uri: string | null
  episode_name: string | null
  episode_show_name: string | null
  spotify_episode_uri: string | null
  audiobook_title: string | null
  audiobook_uri: string | null
  audiobook_chapter_uri: string | null
  audiobook_chapter_title: string | null
  reason_start: string
  reason_end: string
  shuffle: boolean
  skipped: boolean
  offline: boolean
  offline_timestamp: string | null
  incognito_mode: boolean
}

export interface ProcessedListen {
  ts: string
  platform: string
  ms_played: number
  is_valid: boolean
  conn_country: string
  ip_addr: string | null
  track_id: number | null
  reason_start: string
  reason_end: string
  shuffle: boolean
  skipped: boolean
  offline: boolean
  incognito_mode: boolean
}

// Filtrer les données valides (seulement les titres musicaux)
export function filterValidListens(data: SpotifyListenData[]): SpotifyListenData[] {
  return data.filter((listen) => {
    // Exclure les podcasts
    if (listen.episode_name || listen.episode_show_name || listen.spotify_episode_uri) {
      return false
    }

    // Exclure les audiobooks
    if (listen.audiobook_title || listen.audiobook_uri || listen.audiobook_chapter_uri) {
      return false
    }

    // Garder seulement les titres musicaux avec URI Spotify
    return listen.spotify_track_uri && listen.master_metadata_track_name
  })
}

// Calculer is_valid (>= 30 secondes = 30000ms)
export function calculateIsValid(ms_played: number): boolean {
  return ms_played >= 30000
}

// Extraire l'ID Spotify depuis l'URI
export function extractSpotifyId(uri: string | null): string | null {
  if (!uri) return null
  const match = uri.match(/spotify:track:(.+)/)
  return match ? match[1] : null
}

// Importer la fonction extractSpotifyAlbumUri dans le fichier principal
export function extractSpotifyAlbumUri(listen: SpotifyListenData): string | null {
  // Dans les données Spotify actuelles, il n'y a généralement pas d'URI d'album
  // Cette fonction peut être étendue plus tard si les données incluent cette information
  // Pour l'instant, on retourne null pour tous les albums
  return null
}

// Traitement par chunks pour les gros volumes
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// Validation des données JSON
export function validateSpotifyData(data: any[]): { valid: SpotifyListenData[]; errors: string[] } {
  const valid: SpotifyListenData[] = []
  const errors: string[] = []

  data.forEach((item, index) => {
    try {
      // Vérifications de base
      if (!item.ts || !item.platform || typeof item.ms_played !== "number") {
        errors.push(`Ligne ${index + 1}: Données manquantes (ts, platform, ms_played)`)
        return
      }

      if (!item.reason_start || !item.reason_end) {
        errors.push(`Ligne ${index + 1}: reason_start ou reason_end manquant`)
        return
      }

      // Conversion des types
      const listen: SpotifyListenData = {
        ts: item.ts,
        platform: item.platform,
        ms_played: Number(item.ms_played),
        conn_country: item.conn_country || "XX",
        ip_addr: item.ip_addr || null,
        master_metadata_track_name: item.master_metadata_track_name || null,
        master_metadata_album_artist_name: item.master_metadata_album_artist_name || null,
        master_metadata_album_album_name: item.master_metadata_album_album_name || null,
        spotify_track_uri: item.spotify_track_uri || null,
        episode_name: item.episode_name || null,
        episode_show_name: item.episode_show_name || null,
        spotify_episode_uri: item.spotify_episode_uri || null,
        audiobook_title: item.audiobook_title || null,
        audiobook_uri: item.audiobook_uri || null,
        audiobook_chapter_uri: item.audiobook_chapter_uri || null,
        audiobook_chapter_title: item.audiobook_chapter_title || null,
        reason_start: item.reason_start,
        reason_end: item.reason_end,
        shuffle: Boolean(item.shuffle),
        skipped: Boolean(item.skipped),
        offline: Boolean(item.offline),
        offline_timestamp: item.offline_timestamp || null,
        incognito_mode: Boolean(item.incognito_mode),
      }

      valid.push(listen)
    } catch (error) {
      errors.push(`Ligne ${index + 1}: Erreur de validation - ${error}`)
    }
  })

  return { valid, errors }
}
