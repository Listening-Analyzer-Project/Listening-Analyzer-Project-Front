-- FONCTIONS ET TRIGGERS DE BASE DE DONNEES SPOTIFY ANALYZER
-- Ce script cree les fonctions RPC et les triggers associes a la base de donnees.

-- 0. SUPPRESSION DES FONCTIONS EXISTANTES
DROP FUNCTION IF EXISTS validate_track_genre_consistency() CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_tracks(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_albums(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_artists(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_genres(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_sub_genres(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_ambiances(INT[]) CASCADE;
DROP FUNCTION IF EXISTS get_orphaned_spotify_genres(INT[]) CASCADE;
DROP FUNCTION IF EXISTS search_listens(TEXT) CASCADE;
DROP FUNCTION IF EXISTS search_listens_by_track_or_artist(TEXT) CASCADE;

-- 1. FONCTION POUR VALIDER LA COHERENCE GENRE/SOUS-GENRE
CREATE OR REPLACE FUNCTION validate_track_genre_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sub_genre_id IS NOT NULL AND NEW.genre_id IS NOT NULL THEN
      IF NOT EXISTS (
          SELECT 1 FROM sub_genres
          WHERE id = NEW.sub_genre_id AND genre_id = NEW.genre_id
      ) THEN
          RAISE EXCEPTION 'Le sous-genre ne correspond pas au genre';
      END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER POUR VALIDER LA COHERENCE
CREATE TRIGGER trigger_validate_track_genre
BEFORE INSERT OR UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION validate_track_genre_consistency();

-- 3. FONCTIONS DE NETTOYAGE DES ENTITES ORPHELINES
CREATE OR REPLACE FUNCTION get_orphaned_tracks(p_track_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id
  FROM tracks t
  WHERE t.id = ANY(p_track_ids)
  AND NOT EXISTS (SELECT 1 FROM listens l WHERE l.track_id = t.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_albums(p_album_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id
  FROM albums a
  WHERE a.id = ANY(p_album_ids)
  AND NOT EXISTS (SELECT 1 FROM tracks t WHERE t.album_id = a.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_artists(p_artist_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT ar.id
  FROM artists ar
  WHERE ar.id = ANY(p_artist_ids)
  AND NOT EXISTS (SELECT 1 FROM track_artists ta WHERE ta.artist_id = ar.id)
  AND NOT EXISTS (SELECT 1 FROM album_artists aa WHERE aa.artist_id = ar.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_genres(p_genre_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id
  FROM genres g
  WHERE g.id = ANY(p_genre_ids)
  AND NOT EXISTS (SELECT 1 FROM tracks t WHERE t.genre_id = g.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_sub_genres(p_sub_genre_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT sg.id
  FROM sub_genres sg
  WHERE sg.id = ANY(p_sub_genre_ids)
  AND NOT EXISTS (SELECT 1 FROM tracks t WHERE t.sub_genre_id = sg.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_ambiances(p_ambiance_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT am.id
  FROM ambiances am
  WHERE am.id = ANY(p_ambiance_ids)
  AND NOT EXISTS (SELECT 1 FROM tracks t WHERE t.ambiance_id = am.id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orphaned_spotify_genres(p_spotify_genre_ids INT[])
RETURNS TABLE(id INT) AS $$
BEGIN
  RETURN QUERY
  SELECT sg.id
  FROM spotify_genres sg
  WHERE sg.id = ANY(p_spotify_genre_ids)
  AND NOT EXISTS (SELECT 1 FROM artist_spotify_genres asg WHERE asg.spotify_genre_id = sg.id);
END;
$$ LANGUAGE plpgsql;

-- 4. FONCTION DE RECHERCHE AVEC LIMITE EXPLICITE TRÈS ÉLEVÉE ET RECHERCHE MULTIPLE (LOGIQUE "ET")
CREATE OR REPLACE FUNCTION search_listens(p_search_term TEXT)
RETURNS SETOF BIGINT AS $$
DECLARE
    search_terms TEXT[];
    term TEXT;
    where_clause TEXT := '';
    first_term BOOLEAN := TRUE;
BEGIN
    -- Diviser le terme de recherche par ' // '
    search_terms := string_to_array(p_search_term, ' // ');

    -- Construire la clause WHERE pour les termes multiples
    FOREACH term IN ARRAY search_terms LOOP
        term := TRIM(term); -- Supprimer les espaces blancs au début/fin
        IF term != '' THEN
            IF NOT first_term THEN
                where_clause := where_clause || ' AND ';
            END IF;
            -- Inclure la recherche par titre d'album
            where_clause := where_clause || format('(t.title ILIKE %L OR a.name ILIKE %L OR al.title ILIKE %L)', '%' || term || '%', '%' || term || '%', '%' || term || '%');
            first_term := FALSE;
        END IF;
    END LOOP;

    -- Si aucun terme valide n'est trouvé, retourner un ensemble vide
    IF where_clause = '' THEN
        RETURN;
    END IF;

    -- Exécuter la requête dynamique
    RETURN QUERY EXECUTE format('
        SELECT DISTINCT l.id
        FROM listens l
        JOIN tracks t ON l.track_id = t.id
        JOIN albums al ON t.album_id = al.id -- AJOUTÉ ICI : Jointure avec la table albums
        JOIN track_artists ta ON t.id = ta.track_id
        JOIN artists a ON ta.artist_id = a.id
        WHERE %s
        ORDER BY l.id
        LIMIT 2147483647;', where_clause);
END;
$$ LANGUAGE plpgsql;

-- PERMISSIONS
GRANT EXECUTE ON FUNCTION get_orphaned_tracks(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_albums(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_artists(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_genres(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_sub_genres(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_ambiances(INT[]) TO public;
GRANT EXECUTE ON FUNCTION get_orphaned_spotify_genres(INT[]) TO public;
GRANT EXECUTE ON FUNCTION search_listens(TEXT) TO public;

SELECT 'Fonctions et triggers de base de donnees crees avec succes!' as message;
