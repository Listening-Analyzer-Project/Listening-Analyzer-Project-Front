export interface FTrack {
  id?: number
  title: string
  duration_ms?: number
  explicit?: number
  popularity?: number
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
  is_edited: number

  // Relations
  album?: FAlbum
  artists: FArtist[] // First is primary artist
  sub_genre?: FSubGenre // Includes Genre parent
  tags?: FTag[]
}

export interface FArtist {
  id?: number
  name: string
  image_uri?: string
  popularity?: number
  type?: number
  birth?: string

  // Relations
  country?: FCountry
}

export interface FAlbum {
  id?: number
  title: string
  release_date?: string
  image_uri?: string
  popularity?: number
}

export interface FSubGenre {
  id?: number
  name: string
  genre: FGenre
}

export interface FGenre {
  id?: number
  name: string
}

export interface FTag {
  id?: number
  name: string
}

export interface FCountry {
  id?: number
  name: string
  geographical_region?: FGeographicalRegion
}

export interface FGeographicalRegion {
  id?: number
  name: string
}

export interface FPlaylist {
  id?: number
  name: string
  user: FUser
  tracks?: FTrack[]
}

export interface FUser {
  id?: number
  name: string
  type: number
  isadmin: number
  syncro_status: number
}

export interface FListen {
  id?: number
  ts: string
  platform: string
  ms_played: number
  reason_end?: string
  track?: FTrack
  user?: FUser
}

export interface FEvent {
  id?: number
  title: string
  start_date: string
  end_date: string
  description?: string
  category?: FCategory
  user?: FUser
}

export interface FCategory {
  id?: number
  name: string
}
