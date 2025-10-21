// listen-types.ts

export interface CanonicalListen {
  ts: string;
  platform: string;
  ms_played: number;
  reason_end?: string;

  track: {
    title: string;
    duration_ms?: number;
    popularity?: number;
    explicit?: boolean;

    album?: {
      title: string;
      release_date?: string;
      image_uri?: string;
      popularity?: number;
    };

    artists: Array<{
      name: string;
      image_uri?: string;
      popularity?: number;
      country?: string;
      type?: number;
      birth?: string;
    }>;

    genre?: string;
    sub_genre?: string;
    tags?: string[];

    acousticness?: number;
    danceability?: number;
    energy?: number;
    instrumentalness?: number;
    key?: number;
    liveness?: number;
    loudness?: number;
    mode?: number;
    speechiness?: number;
    tempo?: number;
    time_signature?: number;
    valence?: number;
    is_edited?: number;
  };
}

export type ArtistType = CanonicalListen["track"]["artists"][number];

export interface SpotifyListen {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country?: string;
  ip_addr?: string;

  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  spotify_track_uri: string;

  episode_name?: string | null;
  episode_show_name?: string | null;
  spotify_episode_uri?: string | null;

  audiobook_title?: string | null;
  audiobook_uri?: string | null;
  audiobook_chapter_uri?: string | null;
  audiobook_chapter_title?: string | null;

  reason_start?: string;
  reason_end?: string;
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  offline_timestamp?: string | null;
  incognito_mode?: boolean;
}

export interface DeezerListen {
  title: string;
  artist: string;
  listening_time: number | null;
  date: string | null;
  isrc?: string | null;
  album?: string | null;
  ip_address?: string | null;
  platform_name?: string | null;
  platform_model?: string | null;
}

export interface ColumnMapping {
  title: number;
  artist: number;
  listening_time: number;
  date: number;
  isrc?: number;
  album?: number;
  ip_address?: number;
  platform_name?: number;
  platform_model?: number;
}
