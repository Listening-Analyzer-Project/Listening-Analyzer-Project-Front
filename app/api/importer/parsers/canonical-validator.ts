// canonical-validator.ts

import { normalizeDate } from "../services/date-service";
import { ArtistType, CanonicalListen } from "../types/listen-types";

// Function to validate and normalize a raw listen object into a CanonicalListen
export function validateCanonicalListen(raw: unknown): CanonicalListen | null {
  // Basic guard: must be an object
  if (raw === null || typeof raw !== "object") return null;

  // We use a local `any` for convenient property access after the safety check above.
  const r = raw as any;

  // Normalize ts (string/number/date/Excel-like) -> ISO string
  const ts = normalizeDate(r.ts);
  if (!ts) return null;

  // Normalize ms_played: coerce to Number and validate
  const ms = Number(r.ms_played);
  if (!Number.isFinite(ms) || ms < 0) return null;

  // Validate track presence
  if (!r.track || typeof r.track !== "object") return null;

  // Normalize title
  const title = String(r.track.title ?? "").trim();
  if (!title) return null;

  // Validate artists array
  if (!Array.isArray(r.track.artists) || r.track.artists.length === 0)
    return null;

  // Clone & normalize artists (trim names) while preserving other optional artist fields
  const artists: ArtistType[] = r.track.artists.map((a: unknown) => {
    const ai = a === null || typeof a !== "object" ? {} : (a as any);
    const name = String(ai.name ?? "").trim();
    return { ...(ai || {}), name } as ArtistType;
  });

  // Reject if any artist has an empty name after trim
  if (artists.some((a: ArtistType) => !a.name)) return null;

  // Build canonical object:
  // - shallow spread of raw to preserve optional fields
  // - override ts and ms_played with normalized values
  // - build track by shallow spreading raw.track, but replacing title and artists with normalized versions
  const canonical: CanonicalListen = {
    ...(r as CanonicalListen), // preserve other optional fields at top level
    ts,
    ms_played: ms,
    track: {
      ...r.track,
      title,
      artists,
    },
  };

  return canonical;
}
