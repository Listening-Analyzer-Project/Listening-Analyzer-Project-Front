export interface FListenAnalytics {
    listen_id: number,
    listen_timestamp: string,
    platform: string,
    ms_played: number,
    reason_end: string,
    user_id: number,
    is_valid: number,
    user_name: string,
    user_type: number,
    track_id: number,
    track_title: string,
    duration_ms: number,
    explicit: number,
    track_popularity: number,
    is_edited: number,
    album_id: number,
    album_title: string,
    album_release_date: string,
    album_popularity: number,
    album_image_uri: string,
    sub_genre_id: number,
    sub_genre_name: string,
    genre_id: number,
    genre_name: string,
    primary_artist_id: number,
    primary_artist_name: string,
    primary_artist_popularity: number,
    primary_artist_image: string,
    country_id: number,
    country_name: string,
    region_id: number,
    region_name: string,
    all_artists: string,
    all_tags: string,
    rank_num: number
}

export interface FTrackAnalytics {
    track_id: number,
    track_title: string,
    album_title: string,
    all_artists: string,
    genre_name: string,
    sub_genre_name: string,
    all_tags: string,
    valid_listens: number,
    invalid_listens: number,
    rank_num: number
}

export interface FArtistAnalytics {
    artist_id: number,
    artist_name: string,
    country_name: string,
    genre_name: string,
    sub_genres: string,
    valid_listens: number,
    invalid_listens: number,
    rank_num: number
}

export interface FAlbumAnalytics {
    album_id: number,
    album_title: string,
    release_date: string,
    all_artists: string,
    valid_listens: number,
    invalid_listens: number,
    rank_num: number
}
