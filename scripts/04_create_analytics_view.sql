DROP VIEW IF EXISTS analytics_listens;

CREATE OR REPLACE VIEW analytics_listens AS
SELECT
    l.id AS listen_id,
    l.ts,
    l.platform,
    l.ms_played,
    l.is_valid,
    l.conn_country AS listen_country_code,
    l.ip_addr,
    l.reason_start,
    l.reason_end,
    l.shuffle,
    l.skipped,
    l.offline,
    l.incognito_mode,

    t.id AS track_id,
    t.title AS track_title,
    t.spotify_uri AS track_spotify_uri,
    t.explicit AS track_explicit,
    t.popularity AS track_popularity,
    t.duration_ms,

    t.acousticness,
    t.danceability,
    t.energy,
    t.instrumentalness,
    t.key,
    t.liveness,
    t.loudness,
    t.mode,
    t.speechiness,
    t.tempo,
    t.time_signature,
    t.valence,

    al.id AS album_id,
    al.title AS album_title,
    al.spotify_uri AS album_spotify_uri,
    al.release_date AS date_de_sortie,
    al.popularity AS album_popularity,

    pa.id AS primary_artist_id,
    pa.name AS primary_artist_name,
    pa.spotify_uri AS primary_artist_spotify_uri,
    pa.popularity AS primary_artist_popularity,
    TRUE AS primary_artist_is_primary,

    c.id AS primary_artist_country_id,
    c.name AS primary_artist_country,
    r.id AS primary_artist_region_id,
    r.name AS primary_artist_region,

    -- Changed JSON_AGG to JSONB_AGG here
    (
        SELECT JSONB_AGG(json_build_object('id', spg.id::INT, 'name', spg.name))
        FROM artist_spotify_genres asg_sub
        JOIN spotify_genres spg ON asg_sub.spotify_genre_id = spg.id
        WHERE asg_sub.artist_id = pa.id
    ) AS primary_artist_spotify_genres,

    (
        SELECT JSON_AGG(json_build_object(
            'id', ar_all.id::INT,
            'name', ar_all.name,
            'is_primary', ta_all.is_primary
        ) ORDER BY ta_all.is_primary DESC, ar_all.name ASC)
        FROM track_artists ta_all
        JOIN artists ar_all ON ta_all.artist_id = ar_all.id
        WHERE ta_all.track_id = t.id
    ) AS all_track_artists,

    g.id AS genre_id,
    g.name AS style_musical,
    sg.id AS sub_genre_id,
    sg.name AS sous_genre,
    am.id AS ambiance_id,
    am.name AS ambiance,

    ROUND(
        1.0 / GREATEST(1,
            (SELECT COUNT(*) FROM artist_spotify_genres WHERE artist_id = pa.id)
        ), 3
    ) AS listen_weight,

    ROUND(
        1.0 / GREATEST(1,
            COALESCE(
                (SELECT COUNT(*) FROM artist_spotify_genres WHERE artist_id = pa.id),
                1
            )
        ), 3
    ) AS artist_weight,

    1.0 AS genre_weight,

    ROUND(
        CASE
            WHEN l.is_valid THEN
                1.0 / GREATEST(1, (SELECT COUNT(*) FROM artist_spotify_genres WHERE artist_id = pa.id))
            ELSE 0.0
        END, 3
    ) AS count_valid_weighted,

    ROUND(
        CASE
            WHEN NOT l.is_valid THEN
                1.0 / GREATEST(1, (SELECT COUNT(*) FROM artist_spotify_genres WHERE artist_id = pa.id))
            ELSE 0.0
        END, 3
    ) AS count_invalid_weighted,

    ROUND(
        l.ms_played * (1.0 / GREATEST(1, (SELECT COUNT(*) FROM artist_spotify_genres WHERE artist_id = pa.id))), 2
    ) AS total_ms_played_weighted,

    ROUND(
        CASE
            WHEN t.duration_ms > 0
            THEN (l.ms_played::DECIMAL / t.duration_ms) * 100
            ELSE 0.0
        END, 2
    ) AS completion_percentage

FROM listens l
JOIN tracks t ON l.track_id = t.id
JOIN albums al ON t.album_id = al.id
LEFT JOIN LATERAL (
    SELECT ar.id, ar.name, ar.spotify_uri, ar.popularity, ar.country_id
    FROM track_artists ta_sub
    JOIN artists ar ON ta_sub.artist_id = ar.id
    WHERE ta_sub.track_id = t.id AND ta_sub.is_primary = TRUE
    ORDER BY ar.name ASC
    LIMIT 1
) pa ON TRUE

LEFT JOIN countries c ON pa.country_id = c.id
LEFT JOIN geographical_regions r ON c.region_id = r.id
LEFT JOIN genres g ON t.genre_id = g.id
LEFT JOIN sub_genres sg ON t.sub_genre_id = sg.id
LEFT JOIN ambiances am ON t.ambiance_id = am.id;

GRANT SELECT ON analytics_listens TO public;

SELECT
'Vue hybride creee!' AS message,
COUNT(*) AS total_rows_in_view,
COUNT(DISTINCT listen_id) AS unique_listens,
COUNT(DISTINCT primary_artist_id) AS unique_artists,
COUNT(*) FILTER (WHERE primary_artist_spotify_genres IS NULL OR primary_artist_spotify_genres = '[]'::jsonb) AS rows_without_spotify_genre,
COUNT(*) FILTER (WHERE primary_artist_spotify_genres IS NOT NULL AND primary_artist_spotify_genres != '[]'::jsonb) AS rows_with_spotify_genre,
ROUND(AVG(listen_weight), 3) AS avg_listen_weight,
ROUND(AVG(artist_weight), 3) AS avg_artist_weight,
ROUND(AVG(genre_weight), 3) AS avg_genre_weight
FROM analytics_listens;
