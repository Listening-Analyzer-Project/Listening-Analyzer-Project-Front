-- FONCTION POUR RECUPERER LES PAYS CLASSES PAR UTILISATION ET ALPHABETIQUEMENT
-- Ce script cree une fonction RPC pour obtenir une liste de pays priorisee.

DROP FUNCTION IF EXISTS get_ranked_countries() CASCADE;

CREATE OR REPLACE FUNCTION get_ranked_countries()
RETURNS TABLE(id INTEGER, name TEXT, usage_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH country_usage AS (
    SELECT
      c.id,
      c.name,
      COUNT(a.id) AS count_artists,
      -- Assign a rank for countries with artists
      ROW_NUMBER() OVER (ORDER BY COUNT(a.id) DESC, c.name ASC) as rank_by_usage
    FROM countries c
    LEFT JOIN artists a ON c.id = a.country_id
    GROUP BY c.id, c.name
  )
  SELECT
    cu.id,
    cu.name::TEXT,
    cu.count_artists::BIGINT
  FROM country_usage cu
  ORDER BY
    -- Group 1: Top 5 countries with artists (priorité la plus élevée)
    CASE
      WHEN cu.count_artists > 0 AND cu.rank_by_usage <= 5 THEN 0
      -- Group 2: Tous les autres pays avec des artistes (priorité moyenne)
      WHEN cu.count_artists > 0 THEN 1
      -- Group 3: Pays sans artistes (priorité la plus basse)
      ELSE 2
    END ASC,
    -- Tri secondaire pour le Groupe 1: par nombre d'artistes (décroissant)
    CASE
      WHEN cu.count_artists > 0 AND cu.rank_by_usage <= 5 THEN cu.count_artists
      ELSE NULL
    END DESC,
    -- Tri tertiaire pour les Groupes 2 et 3 (et en cas d'égalité pour le Groupe 1): par nom (alphabétique)
    cu.name ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_ranked_countries() TO public;

SELECT 'Fonction get_ranked_countries créée avec succès!' as message;
