import Excel from "exceljs";
import { DeezerListen } from "../models/deezer-listen";
import { findSheetByColumns } from "./excel-utils";

// Interface for column mapping - essential columns are required
interface ColumnMapping {
  title: number;
  artist: number;
  listening_time: number;
  date: number;
  isrc?: number;
  album?: number;
  ip_address?: number;
  platform_name?: number;
  platform_model?: number;
}

//Creates column mapping based on header names
function createColumnMapping(headers: string[]): ColumnMapping {
  const findColumnIndex = (searchTerm: string): number | undefined => {
    const index = headers.findIndex((header) =>
      header.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return index >= 0 ? index : undefined;
  };

  // Essential columns - these are required
  const essentialMappings = {
    title: findColumnIndex("song title"),
    artist: findColumnIndex("artist"),
    listening_time: findColumnIndex("listening time"),
    date: findColumnIndex("date"),
  };

  // Validate that all essential columns are found
  const missingEssential = Object.entries(essentialMappings)
    .filter(([_, index]) => index === undefined)
    .map(([key]) => key);

  if (missingEssential.length > 0) {
    throw new Error(
      `Missing essential columns: ${missingEssential.join(
        ", "
      )}. Available columns: ${headers.join(", ")}`
    );
  }

  const mapping: ColumnMapping = {
    title: essentialMappings.title!,
    artist: essentialMappings.artist!,
    listening_time: essentialMappings.listening_time!,
    date: essentialMappings.date!,
  };

  // Add optional columns only if they exist
  const optionalMappings = {
    isrc: findColumnIndex("isrc"),
    album: findColumnIndex("album title"),
    ip_address: findColumnIndex("ip address"),
    platform_name: findColumnIndex("platform name"),
    platform_model: findColumnIndex("platform model"),
  };

  // Only add defined optional mappings
  Object.entries(optionalMappings).forEach(([key, value]) => {
    if (value !== undefined) {
      mapping[key as keyof typeof optionalMappings] = value;
    }
  });

  return mapping;
}

// Maps a single Excel row to a DeezerListen object using the provided mapping
function mapExcelRowToDeezerListen(
  row: any,
  mapping: ColumnMapping
): DeezerListen {
  const getValue = (index: number | undefined): any => {
    // Column not found or not provided
    if (index === undefined) return undefined;

    // Handle sparse arrays or missing values
    if (!row.values || !Array.isArray(row.values)) return undefined;

    const value = row.values[index];
    return value !== null && value !== undefined ? value : undefined;
  };

  const deezerListen: DeezerListen = {
    title: getValue(mapping.title) || "", // Default to empty string if missing
    artist: getValue(mapping.artist) || "", // Default to empty string if missing
    listening_time: getValue(mapping.listening_time), // Raw value
    date: getValue(mapping.date), // Raw value
    isrc: getValue(mapping.isrc),
    album: getValue(mapping.album),
    ip_address: getValue(mapping.ip_address),
    platform_name: getValue(mapping.platform_name),
    platform_model: getValue(mapping.platform_model),
  };

  return deezerListen;
}

// Streams Deezer Excel rows in batches, yielding arrays of DeezerListen objects
export async function* streamDeezerExcelRows(
  filePath: string,
  batchSize: number = 1000
): AsyncGenerator<DeezerListen[], void, void> {
  const workbook = new Excel.stream.xlsx.WorkbookReader(filePath, {
    worksheets: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
  });

  // Essential columns required for Deezer listening history
  const requiredColumns = ["Song Title", "Artist", "Listening Time", "Date"];

  const sheetInfo = await findSheetByColumns(workbook, requiredColumns);
  if (!sheetInfo) {
    throw new Error(
      `No sheet with Deezer listening history found in ${filePath}`
    );
  }

  const { worksheet, headers } = sheetInfo;
  const mapping = createColumnMapping(headers);

  let currentBatch: DeezerListen[] = [];
  let rowCount = 0;
  let processedCount = 0;

  console.log(
    `[deezer-utils] Processing Deezer Excel with column mapping:`,
    mapping
  );
  console.log(`[deezer-utils] Available columns: ${headers.join(", ")}`);

  for await (const row of worksheet) {
    rowCount++;

    if (rowCount === 1) continue; // Skip header row

    const deezerListen = mapExcelRowToDeezerListen(row, mapping);

    // Basic validation - skip rows missing essential data
    if (!deezerListen.title || !deezerListen.artist) {
      continue;
    }

    currentBatch.push(deezerListen);
    processedCount++;

    if (currentBatch.length >= batchSize) {
      yield currentBatch;
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    yield currentBatch;
  }

  console.log(
    `[deezer-utils] Completed processing ${
      rowCount - 1
    } rows, ${processedCount} valid listens`
  );
  console.log(
    `[deezer-utils] Missing optional columns: ${getMissingColumns(
      mapping,
      headers
    )}`
  );
}

// Helper to list missing optional columns
function getMissingColumns(mapping: ColumnMapping, headers: string[]): string {
  const allOptionalColumns = [
    { key: "isrc", name: "ISRC" },
    { key: "album", name: "Album Title" },
    { key: "ip_address", name: "IP Address" },
    { key: "platform_name", name: "Platform Name" },
    { key: "platform_model", name: "Platform Model" },
  ];

  const missing = allOptionalColumns
    .filter((col) => mapping[col.key as keyof ColumnMapping] === undefined)
    .map((col) => col.name);

  return missing.length > 0 ? missing.join(", ") : "None";
}
