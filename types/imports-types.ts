export interface CanonicalListen {
  ts: string
  platform: string
  ms_played: number
  reason_end?: string

  track: {
    title: string
    duration_ms?: number
    popularity?: number
    explicit?: boolean

    album?: {
      title: string
      release_date?: string
      image_uri?: string
      popularity?: number
    }

    // First is primary artist
    artists: Array<{
      name: string
      image_uri?: string
      popularity?: number
      country?: string
      type?: number
      birth?: string
    }>

    genre?: string
    sub_genre?: string
    tags?: string[]

    acousticness?: number
    danceability?: number
    energy?: number
    instrumentalness?: number
    key?: number
    liveness?: number
    loudness?: number
    mode?: number
    speechiness?: number
    tempo?: number
    time_signature?: number
    valence?: number
    is_edited?: number
  }
}

export type ArtistType = CanonicalListen['track']['artists'][number]

export interface SpotifyListen {
  ts: string
  platform: string
  ms_played: number
  conn_country?: string
  ip_addr?: string

  master_metadata_track_name: string
  master_metadata_album_artist_name: string
  master_metadata_album_album_name: string
  spotify_track_uri: string

  episode_name?: string | null
  episode_show_name?: string | null
  spotify_episode_uri?: string | null

  audiobook_title?: string | null
  audiobook_uri?: string | null
  audiobook_chapter_uri?: string | null
  audiobook_chapter_title?: string | null

  reason_start?: string
  reason_end?: string
  shuffle?: boolean
  skipped?: boolean
  offline?: boolean
  offline_timestamp?: string | null
  incognito_mode?: boolean
}

export type ImportResult = {
  totalListens: number
  existingTrackGroups: number
  newTrackGroups: number
  insertedGenres: number
  insertedSubGenres: number
  insertedAlbums: number
  insertedArtists: number
  insertedTags: number
  insertedTracks: number
  insertedTrackArtists: number
  insertedTrackTags: number
  insertedListens: number
}