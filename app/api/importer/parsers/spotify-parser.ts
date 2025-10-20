// spotify-parser.ts

import { normalizeDate } from "../services/date-service";
import { CanonicalListen, SpotifyListen } from "../types/listen-types";

export function parseSpotifyListen(
  input: SpotifyListen
): CanonicalListen | null {
  if (!input) return null;

  // Ignore podcasts and audiobooks
  if (
    input.spotify_episode_uri ||
    input.episode_name ||
    input.episode_show_name ||
    input.audiobook_title ||
    input.audiobook_uri ||
    input.audiobook_chapter_uri ||
    input.audiobook_chapter_title
  ) {
    return null;
  }

  // Parse and normalize date
  const ts = normalizeDate(input.ts);

  // Basic validation
  if (!ts) return null;
  if (
    typeof input.ms_played !== "number" ||
    Number.isNaN(input.ms_played) ||
    input.ms_played < 0
  )
    return null;

  // Must have at least a track title and an artist name
  const title = (input.master_metadata_track_name ?? "").toString().trim();
  const artistName = (input.master_metadata_album_artist_name ?? "")
    .toString()
    .trim();
  if (!title || !artistName) return null;

  // Album is optional — include only if present and non-empty
  const albumTitle = (input.master_metadata_album_album_name ?? "")
    .toString()
    .trim();
  const album = albumTitle ? { title: albumTitle } : undefined;

  // Platform is optional — default to "unknown" if not present
  const platform = (input.platform ?? "unknown").toString();

  // Build canonical object
  const canonical: CanonicalListen = {
    ts: ts,
    platform,
    ms_played: input.ms_played,
    // only add reason_end if provided
    ...(input.reason_end ? { reason_end: input.reason_end } : {}),

    track: {
      title,
      ...(album ? { album } : {}),

      artists: [
        {
          name: artistName,
        },
      ],

      tags: [],
    },
  };

  return canonical;
}
