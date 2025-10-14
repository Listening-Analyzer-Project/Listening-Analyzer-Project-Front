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
