-- TODO : update tables to match new schema

-- CREATION DE LA STRUCTURE DE BASE DE DONNEES SPOTIFY ANALYZER V2 (mise à jour)
-- Ce script crée les tables, les index, active la RLS et définit des politiques de dev.
-- Il correspond au dernier schéma que tu as fourni (tables: user, playlist, playlist_track, albums, tag, track_tag, artists, categories, countries, events, geographical_regions, listens, genres, sub_genres, track_artists, tracks).

-- 0. SUPPRESSION DES TABLES EXISTANTES (ordre inverse des dépendances)
DROP TABLE IF EXISTS playlist_track CASCADE;
DROP TABLE IF EXISTS track_tag CASCADE;
DROP TABLE IF EXISTS track_artists CASCADE;
DROP TABLE IF EXISTS listens CASCADE;
DROP TABLE IF EXISTS playlist CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS sub_genres CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS tag CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS geographical_regions CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- 1. TABLES UTILISATEURS
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  type INTEGER NOT NULL,
  isadmin BOOLEAN NOT NULL
);

-- 2. PLAYLISTS
CREATE TABLE IF NOT EXISTS playlist (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  user_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_track (
  track_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  PRIMARY KEY (track_id, playlist_id)
);

-- 3. ALBUMS
CREATE TABLE IF NOT EXISTS albums (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  release_date VARCHAR,
  image_uri VARCHAR UNIQUE,
  popularity INTEGER
);

-- 4. TAGS (ambiances renommé "tag") et liaison track_tag
CREATE TABLE IF NOT EXISTS tag (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS track_tag (
  track_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (track_id, tag_id)
);

-- 5. ARTISTES
CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  image_uri VARCHAR UNIQUE,
  popularity INTEGER,
  country_id INTEGER,
  type INTEGER,
  birth VARCHAR
);

-- 6. CATEGORIES / EVENEMENTS
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  category_id INTEGER,
  user_id INTEGER,
  description TEXT,
  CHECK (end_date > start_date)
);

-- 7. REGIONS / PAYS
CREATE TABLE IF NOT EXISTS geographical_regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  geographical_region_id INTEGER
);

-- 8. LISTENS
CREATE TABLE IF NOT EXISTS listens (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMP NOT NULL,
  platform VARCHAR NOT NULL,
  ms_played INTEGER NOT NULL,
  track_id INTEGER,
  user_id INTEGER,
  reason_end VARCHAR
);

-- 9. GENRES / SUB_GENRES
CREATE TABLE IF NOT EXISTS genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sub_genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  genre_id INTEGER NOT NULL
);

-- 10. TRACK_ARTISTS (liaison) et TRACKS
CREATE TABLE IF NOT EXISTS track_artists (
  track_id INTEGER NOT NULL,
  artist_id INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (track_id, artist_id)
);

CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  duration_ms INTEGER,
  album_id INTEGER,
  explicit BOOLEAN DEFAULT false,
  popularity INTEGER,
  sub_genre_id INTEGER,
  acousticness DOUBLE PRECISION,
  danceability DOUBLE PRECISION,
  energy DOUBLE PRECISION,
  instrumentalness DOUBLE PRECISION,
  key INTEGER,
  liveness DOUBLE PRECISION,
  loudness DOUBLE PRECISION,
  mode INTEGER,
  speechiness DOUBLE PRECISION,
  tempo DOUBLE PRECISION,
  time_signature INTEGER,
  valence DOUBLE PRECISION,
  is_edited INTEGER NOT NULL DEFAULT 0
);

-- 11. FOREIGN KEYS (ALTER TABLE ... ADD CONSTRAINT)
ALTER TABLE playlist ADD CONSTRAINT fk_playlist_user_id FOREIGN KEY (user_id) REFERENCES "user"(id);
ALTER TABLE playlist_track ADD CONSTRAINT fk_playlist_track_track_id FOREIGN KEY (track_id) REFERENCES tracks(id);
ALTER TABLE playlist_track ADD CONSTRAINT fk_playlist_track_playlist_id FOREIGN KEY (playlist_id) REFERENCES playlist(id);

ALTER TABLE artists ADD CONSTRAINT fk_artists_country_id FOREIGN KEY (country_id) REFERENCES countries(id);

ALTER TABLE events ADD CONSTRAINT fk_events_category_id FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE events ADD CONSTRAINT fk_events_user_id FOREIGN KEY (user_id) REFERENCES "user"(id);

ALTER TABLE listens ADD CONSTRAINT fk_listens_track_id FOREIGN KEY (track_id) REFERENCES tracks(id);
ALTER TABLE listens ADD CONSTRAINT fk_listens_user_id FOREIGN KEY (user_id) REFERENCES "user"(id);

ALTER TABLE sub_genres ADD CONSTRAINT fk_sub_genres_genre_id FOREIGN KEY (genre_id) REFERENCES genres(id);

ALTER TABLE track_artists ADD CONSTRAINT fk_track_artists_track_id FOREIGN KEY (track_id) REFERENCES tracks(id);
ALTER TABLE track_artists ADD CONSTRAINT fk_track_artists_artist_id FOREIGN KEY (artist_id) REFERENCES artists(id);

ALTER TABLE track_tag ADD CONSTRAINT fk_track_tag_track_id FOREIGN KEY (track_id) REFERENCES tracks(id);
ALTER TABLE track_tag ADD CONSTRAINT fk_track_tag_tag_id FOREIGN KEY (tag_id) REFERENCES tag(id);

ALTER TABLE playlist_track ADD CONSTRAINT fk_playlist_track_playlist FOREIGN KEY (playlist_id) REFERENCES playlist(id);

ALTER TABLE tracks ADD CONSTRAINT fk_tracks_album_id FOREIGN KEY (album_id) REFERENCES albums(id);
ALTER TABLE tracks ADD CONSTRAINT fk_tracks_sub_genre_id FOREIGN KEY (sub_genre_id) REFERENCES sub_genres(id);

ALTER TABLE countries ADD CONSTRAINT fk_countries_region_id FOREIGN KEY (geographical_region_id) REFERENCES geographical_regions(id);

-- 12. INDEXES POUR LA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_name ON "user"(name);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_is_edited ON tracks(is_edited);
CREATE INDEX IF NOT EXISTS idx_listens_ts ON listens(ts);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);

-- 13. ACTIVER ROW LEVEL SECURITY (RLS)
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographical_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- 14. POLITIQUES RLS BASIQUES (accès public pour dev)
-- On crée explicitement les policies pour chaque table (évite DO $$ loops qui posent problème dans Supabase SQL Editor).

-- "user"
DROP POLICY IF EXISTS allow_all_operations ON "user";
CREATE POLICY allow_all_operations ON "user" FOR ALL TO public USING (true) WITH CHECK (true);

-- playlist
DROP POLICY IF EXISTS allow_all_operations ON playlist;
CREATE POLICY allow_all_operations ON playlist FOR ALL TO public USING (true) WITH CHECK (true);

-- playlist_track
DROP POLICY IF EXISTS allow_all_operations ON playlist_track;
CREATE POLICY allow_all_operations ON playlist_track FOR ALL TO public USING (true) WITH CHECK (true);

-- albums
DROP POLICY IF EXISTS allow_all_operations ON albums;
CREATE POLICY allow_all_operations ON albums FOR ALL TO public USING (true) WITH CHECK (true);

-- tag
DROP POLICY IF EXISTS allow_all_operations ON tag;
CREATE POLICY allow_all_operations ON tag FOR ALL TO public USING (true) WITH CHECK (true);

-- track_tag
DROP POLICY IF EXISTS allow_all_operations ON track_tag;
CREATE POLICY allow_all_operations ON track_tag FOR ALL TO public USING (true) WITH CHECK (true);

-- artists
DROP POLICY IF EXISTS allow_all_operations ON artists;
CREATE POLICY allow_all_operations ON artists FOR ALL TO public USING (true) WITH CHECK (true);

-- categories
DROP POLICY IF EXISTS allow_all_operations ON categories;
CREATE POLICY allow_all_operations ON categories FOR ALL TO public USING (true) WITH CHECK (true);

-- countries
DROP POLICY IF EXISTS allow_all_operations ON countries;
CREATE POLICY allow_all_operations ON countries FOR ALL TO public USING (true) WITH CHECK (true);

-- geographical_regions
DROP POLICY IF EXISTS allow_all_operations ON geographical_regions;
CREATE POLICY allow_all_operations ON geographical_regions FOR ALL TO public USING (true) WITH CHECK (true);

-- events
DROP POLICY IF EXISTS allow_all_operations ON events;
CREATE POLICY allow_all_operations ON events FOR ALL TO public USING (true) WITH CHECK (true);

-- listens
DROP POLICY IF EXISTS allow_all_operations ON listens;
CREATE POLICY allow_all_operations ON listens FOR ALL TO public USING (true) WITH CHECK (true);

-- genres
DROP POLICY IF EXISTS allow_all_operations ON genres;
CREATE POLICY allow_all_operations ON genres FOR ALL TO public USING (true) WITH CHECK (true);

-- sub_genres
DROP POLICY IF EXISTS allow_all_operations ON sub_genres;
CREATE POLICY allow_all_operations ON sub_genres FOR ALL TO public USING (true) WITH CHECK (true);

-- track_artists
DROP POLICY IF EXISTS allow_all_operations ON track_artists;
CREATE POLICY allow_all_operations ON track_artists FOR ALL TO public USING (true) WITH CHECK (true);

-- tracks
DROP POLICY IF EXISTS allow_all_operations ON tracks;
CREATE POLICY allow_all_operations ON tracks FOR ALL TO public USING (true) WITH CHECK (true);

-- 15. Message de succès
SELECT 'Structure de base de donnees V2 (mise à jour) créée avec succès!' AS message;
