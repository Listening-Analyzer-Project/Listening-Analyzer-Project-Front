// file-detection-service.ts
import Excel from "exceljs";
import fs from "fs";
import readline from "readline";
import { CanonicalListen, SpotifyListen } from "../types/listen-types";
import { findSheetByColumns } from "./deezer-service";

type FileType = "spotify-json" | "deezer-excel" | "canonical-json";

// Main function to detect file type
export async function detectFileType(filePath: string): Promise<FileType> {
  const ext = (filePath.toLowerCase().split(".").pop() ?? "").trim();

  // First try Excel detection for .xlsx/.xls files
  if (ext === "xlsx" || ext === "xls") {
    try {
      // WorkbookReader is a streaming reader (low memory footprint)
      const workbook: any = new Excel.stream.xlsx.WorkbookReader(filePath, {
        worksheets: "emit",
        sharedStrings: "cache",
        styles: "ignore",
        hyperlinks: "ignore",
      });

      const requiredColumns = [
        "Song Title",
        "Artist",
        "Listening Time",
        "Date",
      ];
      const sheetInfo = await findSheetByColumns(workbook, requiredColumns);
      if (sheetInfo) return "deezer-excel";
    } catch (error) {
      console.warn(
        `[file-detection] Not a valid Excel file or failed to read workbook: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Continue to next checks (do not throw here — file may still be JSON)
    }
  }

  // If JSON file (or unknown extension), read the first non-empty line robustly
  if (ext === "json" || ext === "") {
    // Use a streaming approach to avoid reading large files into memory.
    let stream: fs.ReadStream | null = null;
    let rl: readline.Interface | null = null;
    try {
      stream = fs.createReadStream(filePath, { encoding: "utf8" });
      rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      let firstNonEmptyLine: string | null = null;
      for await (const line of rl) {
        if (line && line.trim()) {
          firstNonEmptyLine = line;
          break;
        }
      }

      // Close resources early
      rl.close();
      stream.destroy();

      if (!firstNonEmptyLine) {
        throw new Error(`Empty JSON file: ${filePath}`);
      }

      let obj: any;
      try {
        obj = JSON.parse(firstNonEmptyLine);
      } catch (err) {
        throw new Error(
          `Invalid JSON in first non-empty line of ${filePath}: ${String(err)}`
        );
      }

      if (isSpotifyListen(obj)) return "spotify-json";
      if (isCanonicalListen(obj)) return "canonical-json";

      throw new Error(`Unknown JSON format in ${filePath}`);
    } finally {
      try {
        rl?.close();
      } catch {}
      try {
        stream?.destroy();
      } catch {}
    }
  }

  // If we didn't match any known format, throw
  throw new Error(`Cannot detect file type for: ${filePath}`);
}

/**
 * Type guard for Spotify listen format.
 * Checks presence of key Spotify fields typical of Spotify "StreamingHistory" / export.
 */
export function isSpotifyListen(obj: unknown): obj is SpotifyListen {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as any;
  return (
    "master_metadata_track_name" in o &&
    "master_metadata_album_artist_name" in o &&
    "spotify_track_uri" in o &&
    "ts" in o &&
    "ms_played" in o
  );
}

/**
 * Type guard for CanonicalListen format.
 * Ensures the minimal canonical structure exists: ts, ms_played, track.title, track.artists[] with artist.name
 */
export function isCanonicalListen(obj: unknown): obj is CanonicalListen {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as any;

  if (!("ts" in o) || !("ms_played" in o)) return false;
  if (!o.track || typeof o.track !== "object") return false;
  if (typeof o.track.title !== "string") return false;
  if (!Array.isArray(o.track.artists) || o.track.artists.length === 0)
    return false;

  const firstArtist = o.track.artists[0];
  if (!firstArtist || typeof firstArtist !== "object") return false;
  if (!("name" in firstArtist)) return false;

  return true;
}
