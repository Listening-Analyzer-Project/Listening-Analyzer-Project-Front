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
