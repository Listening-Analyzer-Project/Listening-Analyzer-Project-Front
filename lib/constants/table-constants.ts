import { ColumnOption, RenderType, ViewType } from "@/types";

export const COLUMNS_BY_VIEW: Record<string, ColumnOption[]> = {
    listens: [
        { key: 'user_name', label: 'User', description: 'User name', sortable: true, defaultVisible: false },
        { key: 'ts', label: 'Date & Time', description: 'Date and time of the listen', sortable: true, defaultVisible: true },
        { key: 'title', label: 'Track', description: 'Song title', sortable: true, defaultVisible: true },
        { key: 'explicit', label: 'Explicit', description: 'Explicit content', sortable: true, defaultVisible: false },
        { key: 'artist', label: 'Artist', description: 'Main artist', sortable: true, defaultVisible: true },
        { key: 'featurings', label: 'Featurings', description: 'List of other artists on the track', sortable: false, defaultVisible: false },
        { key: 'album', label: 'Album', description: 'Album title', sortable: true, defaultVisible: true },
        { key: 'album_release_date', label: 'Release Date', description: 'Album release date', sortable: true, defaultVisible: false },
        { key: 'ms_played', label: 'Listening time', description: 'For how long the song was played', sortable: true, defaultVisible: true },
        { key: 'reason_end', label: 'End Reason', description: 'Why the listen ended', sortable: true, defaultVisible: true },
        { key: 'track_duration', label: 'Track duration', description: 'Total song duration', sortable: true, defaultVisible: false },
        { key: 'is_valid', label: 'Is valid ?', description: 'Amount of listens taken into account', sortable: true, defaultVisible: true },
        { key: 'genre_name', label: 'Genre', description: 'Main musical genre', sortable: true, defaultVisible: false },
        { key: 'sub_genre_name', label: 'Sub-genre', description: 'Musical sub-genre', sortable: true, defaultVisible: false },
        { key: 'all_tags', label: 'Tags', description: 'Associated tags', sortable: true, defaultVisible: false },
        { key: 'country_name', label: 'Country', description: 'Artist country of origin', sortable: true, defaultVisible: false },
        { key: 'region_name', label: 'Region', description: 'Geographical region', sortable: true, defaultVisible: false },
        { key: 'track_popularity', label: 'Track Popularity', description: 'Song popularity score', sortable: true, defaultVisible: false },
        { key: 'primary_artist_popularity', label: 'Artist Popularity', description: 'Artist popularity score', sortable: true, defaultVisible: false },
        { key: 'album_popularity', label: 'Album Popularity', description: 'Album popularity score', sortable: true, defaultVisible: false },
        { key: 'platform', label: 'Platform', description: 'Listening platform (Spotify, Deezer, etc.)', sortable: true, defaultVisible: false },
    ],
    tracks: [
        { key: 'rank_num', label: 'Rank', description: 'Ranking based on number of listens', sortable: true, defaultVisible: true },
        { key: 'valid_listens', label: 'Valid listens', description: 'Total amount of listens for this track', sortable: true, defaultVisible: true },
        { key: 'invalid_listens', label: 'Invalid listens', description: 'Amount of listens under 30s', sortable: true, defaultVisible: true },
        { key: 'track_title', label: 'Track', description: 'Song title', sortable: true, defaultVisible: true },
        { key: 'artist', label: 'Artist', description: 'Main artist', sortable: true, defaultVisible: true },
        { key: 'featurings', label: 'Featurings', description: 'All participating artists', sortable: true, defaultVisible: false },
        { key: 'album_title', label: 'Album', description: 'Album title', sortable: true, defaultVisible: true },
        { key: 'genre_name', label: 'Genre', description: 'Main musical genre', sortable: true, defaultVisible: true },
        { key: 'sub_genre_name', label: 'Sub-genre', description: 'Musical sub-genre', sortable: true, defaultVisible: true },
        { key: 'all_tags', label: 'Tags', description: 'Tags associated with the track', sortable: true, defaultVisible: false },
    ],
    artists: [
        { key: 'rank_num', label: 'Rank', description: 'Artist ranking', sortable: true, defaultVisible: true },
        { key: 'valid_listens', label: 'Valid listens', description: 'Total amount of listens for this artist', sortable: true, defaultVisible: true },
        { key: 'invalid_listens', label: 'Invalid listens', description: 'Total invalid listens for this artist', sortable: true, defaultVisible: true },
        { key: 'artist_name', label: 'Artist', description: 'Artist name', sortable: true, defaultVisible: true },
        { key: 'country_name', label: 'Country', description: 'Artist country of origin', sortable: true, defaultVisible: true },
        { key: 'genre_name', label: 'Genre', description: 'Artist main genre', sortable: true, defaultVisible: true },
        { key: 'sub_genres', label: 'Sub-genres', description: 'List of artist sub-genres', sortable: true, defaultVisible: false },
    ],
    albums: [
        { key: 'rank_num', label: 'Rank', description: 'Album ranking', sortable: true, defaultVisible: true },
        { key: 'valid_listens', label: 'Valid listens', description: 'Total amount of listens for this album', sortable: true, defaultVisible: true },
        { key: 'invalid_listens', label: 'Invalid listens', description: 'Total invalid listens for this album', sortable: true, defaultVisible: true },
        { key: 'album_title', label: 'Album', description: 'Album title', sortable: true, defaultVisible: true },
        { key: 'release_date', label: 'Release Date', description: 'Album release date', sortable: true, defaultVisible: true },
        { key: 'all_artists', label: 'Artists', description: 'Album artists', sortable: true, defaultVisible: true },
    ],
}

// Configuration: mapping des clés de colonnes vers les noms de champs dans les données
export const COLUMN_FIELD_MAPPINGS: Record<ViewType, Record<string, string | ((item: any) => any)>> = {
    listens: {
        user_name: 'user_name',
        ts: 'listen_timestamp',
        title: 'track_title',
        explicit: 'explicit',
        artist: 'primary_artist_name',
        featurings: 'all_artists',
        album: 'album_title',
        album_release_date: 'album_release_date',
        ms_played: 'ms_played',
        reason_end: 'reason_end',
        track_duration: 'duration_ms',
        is_valid: 'is_valid',
        genre_name: 'genre_name',
        sub_genre_name: 'sub_genre_name',
        all_tags: 'all_tags',
        country_name: 'country_name',
        region_name: 'region_name',
        track_popularity: 'track_popularity',
        primary_artist_popularity: 'primary_artist_popularity',
        album_popularity: 'album_popularity',
        platform: 'platform',
    },
    tracks: {
        rank_num: 'rank_num',
        valid_listens: 'valid_listens',
        invalid_listens: 'invalid_listens',
        track_title: 'track_title',
        // explicit: 'explicit',
        artist: 'primary_artist_name',
        featurings: 'all_artists',
        album_title: 'album_title',
        genre_name: 'genre_name',
        sub_genre_name: 'sub_genre_name',
        all_tags: 'all_tags',
        // track_popularity: 'track_popularity',
        // acousticness?: number
        // danceability?: number
        // energy?: number
        // instrumentalness?: number
        // key?: number
        // liveness?: number
        // loudness?: number
        // mode?: number
        // speechiness?: number
        // tempo?: number
        // time_signature?: number
        // valence?: number
    },
    artists: {
        rank_num: 'rank_num',
        valid_listens: 'valid_listens',
        invalid_listens: 'invalid_listens',
        artist_name: 'artist_name',
        // artist_type: 'type',
        // birth_date: 'birth',
        country_name: 'country_name',
        //region_name: 'region_name',
        genre_name: 'genre_name',
        sub_genres: 'sub_genres',
        // all_tags: 'all_tags',
    },
    albums: {
        rank_num: 'rank_num',
        valid_listens: 'valid_listens',
        invalid_listens: 'invalid_listens',
        album_title: 'album_title',
        release_date: 'release_date',
        all_artists: 'all_artists',
        //genre_name: 'genre_name',
        //sub_genres: 'sub_genres',
        //all_tags: 'all_tags',
    }
}

export const COLUMN_RENDER_TYPES: Record<string, RenderType> = {
    // Listens
    user_name: 'badges',
    ts: 'timestamp',
    title: 'title',
    artist: 'text',
    album: 'album',
    ms_played: 'duration',
    reason_end: 'text',
    is_valid: 'boolean',
    platform: 'text',
    track_duration: 'duration',
    explicit: 'boolean',
    track_popularity: 'number',
    album_release_date: 'date',
    album_popularity: 'number',
    primary_artist_popularity: 'number',
    featurings: 'text',

    // Listens, Tracks, Artists, Album communs
    country_name: 'text',
    region_name: 'text',
    genre_name: 'badges',
    sub_genre_name: 'badges',
    all_tags: 'badges',

    // Tracks, Artists, Albums communs
    rank_num: 'rank',
    track_title: 'title',
    album_title: 'album',
    artist_name: 'title',
    all_artists: 'text',
    release_date: 'date',
    valid_listens: 'validListens',
    invalid_listens: 'invalidListens',
    sub_genres: 'text', 
}

export const COLUMN_BADGE_CONTEXT: Record<string, 'user' | 'genre' | 'sub_genre' | 'tag'> = {
    user_name: 'user',
    genre_name: 'genre',
    sub_genre_name: 'sub_genre',
    all_tags: 'tag',
}

// Configuration: styles CSS pour chaque type de rendu
export const COLUMN_CELL_STYLES: Record<RenderType, string> = {
    timestamp: 'font-medium text-muted-foreground whitespace-nowrap min-w-[170px]',
    date: 'text-muted-foreground',
    title: 'font-semibold text-foreground max-w-[200px]',
    text: 'max-w-[150px]',
    album: 'max-w-[160px]',
    rank: 'font-bold text-muted-foreground w-16',
    duration: 'tabular-nums',
    badges: 'min-w-[120px] max-w-[500px]',
    boolean: '',
    number: 'tabular-nums',
    validListens: 'font-medium text-green-600 dark:text-green-400 tabular-nums',
    invalidListens: 'text-muted-foreground tabular-nums',
}