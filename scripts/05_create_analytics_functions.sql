-- FONCTIONS D'AGRÉGATION POUR LES ANALYTICS
-- Ce script cree les fonctions RPC et les triggers associes a la base de donnees.

-- Set client encoding to UTF8 to prevent character issues
SET client_encoding TO 'UTF8';

-- 0. SUPPRESSION DES FONCTIONS EXISTANTES (pour s'assurer qu'on recrée proprement)
DROP FUNCTION IF EXISTS get_artists_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_albums_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_tracks_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;

-- 1. FONCTION POUR LES STATISTIQUES D'ARTISTES
CREATE OR REPLACE FUNCTION get_artists_analytics(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'valid_listens',
  p_order_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  artist_id INTEGER,
  artist_name TEXT,
  country_name TEXT,
  country_id INTEGER, -- AJOUTÉ : ID du pays de l'artiste
  spotify_genres_list TEXT,
  valid_listens BIGINT,
  invalid_listens BIGINT,
  total_listens BIGINT,
  rank_num BIGINT,
  total_count BIGINT
) AS $$
DECLARE
  v_order_clause TEXT;
  v_search_clause TEXT := '';
  v_query TEXT;
BEGIN
  -- Construire la clause de recherche
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_clause := 'AND a.name ILIKE ' || quote_literal('%' || p_search || '%');
  END IF;

  -- Construire la clause d'ordre
  CASE p_order_by
    WHEN 'artist_name' THEN
      v_order_clause := 'ORDER BY artist_name ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'invalid_listens' THEN
      v_order_clause := 'ORDER BY invalid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'total_listens' THEN
      v_order_clause := 'ORDER BY total_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'country_name' THEN
      v_order_clause := 'ORDER BY country_name ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'spotify_genres_list' THEN -- Nouvelle option de tri
      v_order_clause := 'ORDER BY spotify_genres_list ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    ELSE -- 'valid_listens' par défaut
      v_order_clause := 'ORDER BY valid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END CASE;

  -- Construire et exécuter la requête
  v_query := '
    WITH grouped_artists AS (
      SELECT
        a.id as artist_id,
        a.name::TEXT as artist_name,
        c.name::TEXT as country_name,
        a.country_id::INTEGER as country_id, -- AJOUTÉ : Sélection de l''ID du pays
        (
          SELECT STRING_AGG(spg.name, '', '' ORDER BY spg.name)
          FROM artist_spotify_genres asg_sub
          JOIN spotify_genres spg ON asg_sub.spotify_genre_id = spg.id
          WHERE asg_sub.artist_id = a.id
        )::TEXT as spotify_genres_list, -- Agrégation des genres Spotify
        COUNT(CASE WHEN l.is_valid = true THEN 1 END)::BIGINT as valid_listens,
        COUNT(CASE WHEN l.is_valid = false THEN 1 END)::BIGINT as invalid_listens,
        COUNT(l.id)::BIGINT as total_listens
      FROM artists a
      LEFT JOIN countries c ON a.country_id = c.id
      INNER JOIN track_artists ta ON a.id = ta.artist_id
      INNER JOIN tracks t ON ta.track_id = t.id
      INNER JOIN listens l ON t.id = l.track_id
      WHERE 1=1 ' || v_search_clause || '
      GROUP BY a.id, a.name, c.name, a.country_id -- AJOUTÉ : Groupement par l''ID du pays
      HAVING COUNT(l.id) > 0
    ),
    final_results AS (
      SELECT
        artist_id,
        artist_name,
        country_name,
        country_id, -- Inclure dans final_results
        spotify_genres_list,
        valid_listens,
        invalid_listens,
        total_listens
      FROM grouped_artists
      ' || v_order_clause || '
    ),
    ranked_results AS (
        SELECT
            final_results.*,
            ROW_NUMBER() OVER ( ' || v_order_clause || ' ) as rank_num
        FROM final_results
    )
    SELECT
      rr.*,
      (SELECT COUNT(*)::BIGINT FROM final_results) as total_count
    FROM ranked_results rr
    LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;

-- 2. FONCTION POUR LES STATISTIQUES D'ALBUMS
CREATE OR REPLACE FUNCTION get_albums_analytics(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'valid_listens',
  p_order_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  album_id INTEGER,
  album_title TEXT,
  release_date TEXT, -- Ajout de la colonne release_date
  artists TEXT,
  valid_listens BIGINT,
  invalid_listens BIGINT,
  total_listens BIGINT,
  rank_num BIGINT, -- Ajout du rang
  total_count BIGINT
) AS $$
DECLARE
  v_order_clause TEXT;
  v_search_clause TEXT := '';
  v_query TEXT;
BEGIN
  -- Construire la clause de recherche
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_clause := 'AND (COALESCE(al.title, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(artists_list, '''') ILIKE ' || quote_literal('%' || p_search || '%') || ')';
  END IF;

  -- Construire la clause d'ordre
  CASE p_order_by
    WHEN 'album_title' THEN
      v_order_clause := 'ORDER BY album_title ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'artists' THEN
      v_order_clause := 'ORDER BY artists_list ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'invalid_listens' THEN
      v_order_clause := 'ORDER BY invalid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'total_listens' THEN
      v_order_clause := 'ORDER BY total_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'release_date' THEN -- Nouvelle option de tri
      v_order_clause := 'ORDER BY release_date ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    ELSE -- 'valid_listens' par défaut
      v_order_clause := 'ORDER BY valid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END CASE;

  -- Construire et exécuter la requête
  v_query := '
    WITH album_artists_agg AS (
      SELECT
        al.id as album_id,
        STRING_AGG(DISTINCT a.name, '', '' ORDER BY a.name)::TEXT as artists_list
      FROM albums al
      INNER JOIN tracks t ON al.id = t.album_id
      INNER JOIN track_artists ta ON t.id = ta.track_id
      INNER JOIN artists a ON ta.artist_id = a.id
      GROUP BY al.id
    ),
    album_stats AS (
      SELECT
        al.id as album_id,
        al.title::TEXT as album_title,
        al.release_date::TEXT as release_date, -- Sélection de la date de sortie
        aaa.artists_list,
        COUNT(CASE WHEN l.is_valid = true THEN 1 END)::BIGINT as valid_listens,
        COUNT(CASE WHEN l.is_valid = false THEN 1 END)::BIGINT as invalid_listens,
        COUNT(l.id)::BIGINT as total_listens
      FROM albums al
      INNER JOIN tracks t ON al.id = t.album_id
      INNER JOIN listens l ON t.id = l.track_id
      LEFT JOIN album_artists_agg aaa ON al.id = aaa.album_id
      WHERE 1=1 ' || v_search_clause || '
      GROUP BY al.id, al.title, al.release_date, aaa.artists_list -- Groupement par date de sortie également
      HAVING COUNT(l.id) > 0
    ),
    final_results AS (
      SELECT
        album_id,
        album_title,
        release_date, -- Inclure dans final_results
        artists_list as artists,
        valid_listens,
        invalid_listens,
        total_listens
      FROM album_stats
      ' || v_order_clause || '
    ),
    ranked_results AS (
        SELECT
            final_results.*,
            ROW_NUMBER() OVER ( ' || v_order_clause || ' ) as rank_num
        FROM final_results
    )
    SELECT
      rr.*,
      (SELECT COUNT(*)::BIGINT FROM final_results) as total_count
    FROM ranked_results rr
    LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;

-- 3. FONCTION POUR LES STATISTIQUES DE TRACKS
CREATE OR REPLACE FUNCTION get_tracks_analytics(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'valid_listens',
  p_order_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  track_id INTEGER,
  track_title TEXT,
  album_title TEXT,
  artists TEXT,
  genre_name TEXT, -- Ajout du nom du genre
  sub_genre_name TEXT, -- Ajout du nom du sous-genre
  ambiance_name TEXT, -- Ajout du nom de l'ambiance
  valid_listens BIGINT,
  invalid_listens BIGINT,
  total_listens BIGINT,
  rank_num BIGINT,
  total_count BIGINT
) AS $$
DECLARE
  v_order_clause TEXT;
  v_search_clause TEXT := '';
  v_query TEXT;
BEGIN
  -- Construire la clause de recherche
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_clause := 'AND (COALESCE(t.title, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(al.title, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(artists_list, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(g.name, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(sg.name, '''') ILIKE ' || quote_literal('%' || p_search || '%') ||
                       ' OR COALESCE(am.name, '''') ILIKE ' || quote_literal('%' || p_search || '%') || ')';
  END IF;

  -- Construire la clause d'ordre
  CASE p_order_by
    WHEN 'track_title' THEN
      v_order_clause := 'ORDER BY track_title ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'album_title' THEN
      v_order_clause := 'ORDER BY album_title ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'artists' THEN
      v_order_clause := 'ORDER BY artists_list ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'genre_name' THEN -- Nouvelle option de tri
      v_order_clause := 'ORDER BY genre_name ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'sub_genre_name' THEN -- Nouvelle option de tri
      v_order_clause := 'ORDER BY sub_genre_name ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'ambiance_name' THEN -- Nouvelle option de tri
      v_order_clause := 'ORDER BY ambiance_name ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'invalid_listens' THEN
      v_order_clause := 'ORDER BY invalid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    WHEN 'total_listens' THEN
      v_order_clause := 'ORDER BY total_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
    ELSE -- 'valid_listens' par défaut
      v_order_clause := 'ORDER BY valid_listens ' || CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END;
  END CASE;

  -- Construire et exécuter la requête
  v_query := '
    WITH track_artists_agg AS (
      SELECT
        t.id as track_id,
        STRING_AGG(DISTINCT a.name, '', '' ORDER BY a.name)::TEXT as artists_list
      FROM tracks t
      INNER JOIN track_artists ta ON t.id = ta.track_id
      INNER JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.id
    ),
    track_stats AS (
      SELECT
        t.id as track_id,
        t.title::TEXT as track_title,
        al.title::TEXT as album_title,
        taa.artists_list,
        g.name::TEXT as genre_name, -- Sélection du nom du genre
        sg.name::TEXT as sub_genre_name, -- Sélection du nom du sous-genre
        am.name::TEXT as ambiance_name, -- Sélection du nom de l''ambiance
        COUNT(CASE WHEN l.is_valid = true THEN 1 END)::BIGINT as valid_listens,
        COUNT(CASE WHEN l.is_valid = false THEN 1 END)::BIGINT as invalid_listens,
        COUNT(l.id)::BIGINT as total_listens
      FROM tracks t
      INNER JOIN albums al ON t.album_id = al.id
      INNER JOIN listens l ON t.id = l.track_id
      LEFT JOIN track_artists_agg taa ON t.id = taa.track_id
      LEFT JOIN genres g ON t.genre_id = g.id -- Jointure pour le genre
      LEFT JOIN sub_genres sg ON t.sub_genre_id = sg.id -- Jointure pour le sous-genre
      LEFT JOIN ambiances am ON t.ambiance_id = am.id -- Jointure pour l''ambiance
      WHERE 1=1 ' || v_search_clause || '
      GROUP BY t.id, t.title, al.title, taa.artists_list, g.name, sg.name, am.name -- Groupement par les nouvelles colonnes
      HAVING COUNT(l.id) > 0
    ),
    final_results AS (
      SELECT
        track_id,
        track_title,
        album_title,
        artists_list as artists,
        genre_name, -- Inclure dans final_results
        sub_genre_name, -- Inclure dans final_results
        ambiance_name, -- Inclure dans final_results
        valid_listens,
        invalid_listens,
        total_listens
      FROM track_stats
      ' || v_order_clause || '
    ),
    ranked_results AS (
        SELECT
            final_results.*,
            ROW_NUMBER() OVER ( ' || v_order_clause || ' ) as rank_num
        FROM final_results
    )
    SELECT
      rr.*,
      (SELECT COUNT(*)::BIGINT FROM final_results) as total_count
    FROM ranked_results rr
    LIMIT ' || p_limit || ' OFFSET ' || p_offset;

  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION get_artists_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_albums_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_tracks_analytics(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;

-- Message de succès
SELECT 'Fonctions d''analytics créées avec succès!' as message;
