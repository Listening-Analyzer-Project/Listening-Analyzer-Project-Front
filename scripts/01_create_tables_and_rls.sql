-- CREATION DE LA STRUCTURE DE BASE DE DONNEES SPOTIFY ANALYZER
-- Ce script cree les tables, les indexes et active la RLS.

-- 0. SUPPRESSION DES TABLES EXISTANTES (dans l'ordre inverse des dependances, avec CASCADE)
-- Cela supprimera aussi les triggers associes aux tables.
DROP TABLE IF EXISTS listens CASCADE;
DROP TABLE IF EXISTS track_artists CASCADE;
DROP TABLE IF EXISTS album_artists CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS artist_spotify_genres CASCADE;
DROP TABLE IF EXISTS spotify_genres CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS sub_genres CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS ambiances CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS geographical_regions CASCADE;

-- 1. TABLES DE REFERENCE GEOGRAPHIQUE
CREATE TABLE IF NOT EXISTS geographical_regions (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS countries (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE,
region_id INTEGER REFERENCES geographical_regions(id)
);

-- 2. TABLES ARTISTES
CREATE TABLE IF NOT EXISTS artists (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
spotify_uri VARCHAR(255) UNIQUE,
popularity INTEGER CHECK (popularity >= 0 AND popularity <= 100),
country_id INTEGER REFERENCES countries(id)
);

-- 3. TABLES GENRES SPOTIFY (bruts)
CREATE TABLE IF NOT EXISTS spotify_genres (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS artist_spotify_genres (
artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
spotify_genre_id INTEGER REFERENCES spotify_genres(id) ON DELETE CASCADE,
PRIMARY KEY (artist_id, spotify_genre_id)
);

-- 4. TABLES GENRES PERSONNALISES
CREATE TABLE IF NOT EXISTS genres (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sub_genres (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ambiances (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE
);

-- 5. TABLES ALBUMS
CREATE TABLE IF NOT EXISTS albums (
id SERIAL PRIMARY KEY,
title VARCHAR(255) NOT NULL,
release_date VARCHAR(255), -- Revert to VARCHAR(255) as per user's data
spotify_uri VARCHAR(255) UNIQUE,
popularity INTEGER CHECK (popularity >= 0 AND popularity <= 100)
);

-- 6. TABLES TRACKS
CREATE TABLE IF NOT EXISTS tracks (
id SERIAL PRIMARY KEY,
title VARCHAR(255) NOT NULL,
duration_ms INTEGER CHECK (duration_ms >= 0),
album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
spotify_uri VARCHAR(255) NOT NULL UNIQUE,
explicit BOOLEAN DEFAULT FALSE,
popularity INTEGER CHECK (popularity >= 0 AND popularity <= 100),
genre_id INTEGER REFERENCES genres(id),
sub_genre_id INTEGER REFERENCES sub_genres(id),
ambiance_id INTEGER REFERENCES ambiances(id),
-- Audio features
acousticness FLOAT CHECK (acousticness >= 0 AND acousticness <= 1),
danceability FLOAT CHECK (danceability >= 0 AND danceability <= 1),
energy FLOAT CHECK (energy >= 0 AND energy <= 1),
instrumentalness FLOAT CHECK (instrumentalness >= 0 AND instrumentalness <= 1),
key INTEGER CHECK (key >= 0 AND key <= 11),
liveness FLOAT CHECK (liveness >= 0 AND liveness <= 1),
loudness FLOAT,
mode INTEGER CHECK (mode IN (0, 1)),
speechiness FLOAT CHECK (speechiness >= 0 AND speechiness <= 1),
tempo FLOAT CHECK (tempo > 0),
time_signature INTEGER CHECK (time_signature > 0),
valence FLOAT CHECK (valence >= 0 AND valence <= 1)
);

-- 7. TABLES DE LIAISON ARTISTES
CREATE TABLE IF NOT EXISTS track_artists (
track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
is_primary BOOLEAN DEFAULT FALSE,
PRIMARY KEY (track_id, artist_id)
);

CREATE TABLE IF NOT EXISTS album_artists (
album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
PRIMARY KEY (album_id, artist_id)
);

-- 8. TABLE ECOUTES
CREATE TABLE IF NOT EXISTS listens (
id BIGSERIAL PRIMARY KEY,
ts TIMESTAMP NOT NULL,
platform VARCHAR(255) NOT NULL,
ms_played INTEGER NOT NULL CHECK (ms_played >= 0),
is_valid BOOLEAN NOT NULL,
conn_country VARCHAR(2) NOT NULL,
ip_addr VARCHAR(255),
track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
reason_start VARCHAR(255) NOT NULL,
reason_end VARCHAR(255) NOT NULL,
shuffle BOOLEAN NOT NULL,
skipped BOOLEAN NOT NULL,
offline BOOLEAN NOT NULL,
incognito_mode BOOLEAN NOT NULL,
UNIQUE (track_id, ts, ms_played) -- Contrainte d'unicité ajoutée ici
);

-- 9. TABLES EVENEMENTS
CREATE TABLE IF NOT EXISTS categories (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS subcategories (
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE,
category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
id SERIAL PRIMARY KEY,
start_date TIMESTAMP NOT NULL,
end_date TIMESTAMP NOT NULL,
category_id INTEGER REFERENCES categories(id),
subcategory_id INTEGER REFERENCES subcategories(id),
description TEXT,
CHECK (end_date > start_date)
);

-- 10. INDEXES POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_uri ON artists(spotify_uri);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title); -- Ligne corrigée
CREATE INDEX IF NOT EXISTS idx_tracks_spotify_uri ON tracks(spotify_uri);
CREATE INDEX IF NOT EXISTS idx_listens_ts ON listens(ts);
CREATE INDEX IF NOT EXISTS idx_listens_track_id ON listens(track_id);
CREATE INDEX IF NOT EXISTS idx_listens_is_valid ON listens(is_valid);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);

-- 11. ACTIVER ROW LEVEL SECURITY
ALTER TABLE geographical_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_spotify_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambiances ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 12. POLITIQUES RLS BASIQUES (acces public pour le developpement)
DO $$
BEGIN
-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "allow_all_operations" ON geographical_regions;
DROP POLICY IF EXISTS "allow_all_operations" ON countries;
DROP POLICY IF EXISTS "allow_all_operations" ON artists;
DROP POLICY IF EXISTS "allow_all_operations" ON spotify_genres;
DROP POLICY IF EXISTS "allow_all_operations" ON artist_spotify_genres;
DROP POLICY IF EXISTS "allow_all_operations" ON genres;
DROP POLICY IF EXISTS "allow_all_operations" ON sub_genres;
DROP POLICY IF EXISTS "allow_all_operations" ON ambiances;
DROP POLICY IF EXISTS "allow_all_operations" ON albums;
DROP POLICY IF EXISTS "allow_all_operations" ON tracks;
DROP POLICY IF EXISTS "allow_all_operations" ON track_artists;
DROP POLICY IF EXISTS "allow_all_operations" ON album_artists;
DROP POLICY IF EXISTS "allow_all_operations" ON listens;
DROP POLICY IF EXISTS "allow_all_operations" ON categories;
DROP POLICY IF EXISTS "allow_all_operations" ON subcategories;
DROP POLICY IF EXISTS "allow_all_operations" ON events;

-- Creer les nouvelles politiques
CREATE POLICY "allow_all_operations" ON geographical_regions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON countries FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON artists FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON spotify_genres FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON artist_spotify_genres FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON genres FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON sub_genres FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON ambiances FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON albums FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON tracks FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON track_artists FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON album_artists FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON listens FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON subcategories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON events FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

-- Message de succes
SELECT 'Structure de base de donnees creee avec succes!' as message;
