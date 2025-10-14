import { CanonicalListen } from "../models/canonical-listen";
import { SpotifyListen } from "../models/spotify-listen";

export function isSpotifyListen(obj: any): obj is SpotifyListen {
  return (
    obj &&
    typeof obj === "object" &&
    "master_metadata_track_name" in obj &&
    "master_metadata_album_artist_name" in obj &&
    "spotify_track_uri" in obj &&
    "ts" in obj &&
    "ms_played" in obj
  );
}

export function isCanonicalListen(obj: any): obj is CanonicalListen {
  return (
    obj &&
    typeof obj === "object" &&
    "track" in obj &&
    obj.track &&
    typeof obj.track === "object" &&
    "title" in obj.track &&
    "artists" in obj.track &&
    Array.isArray(obj.track.artists) &&
    obj.track.artists.length > 0 &&
    "name" in obj.track.artists[0] &&
    "ts" in obj &&
    "ms_played" in obj
  );
}
