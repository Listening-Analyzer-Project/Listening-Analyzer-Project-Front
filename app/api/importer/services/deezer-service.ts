// deezer-service.ts

import Excel from "exceljs";
import { ColumnMapping, DeezerListen } from "../types/listen-types";

// Creates a mapping from column headers to DeezerListen fields
function createColumnMapping(headers: string[]): ColumnMapping {
  const findColumnIndex = (searchTerm: string): number | undefined => {
    const index = headers.findIndex((header) =>
      header.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return index >= 0 ? index + 1 : undefined; // IMPORTANT: return 1-based column number
  };

  const essentialMappings = {
    title: findColumnIndex("song title"),
    artist: findColumnIndex("artist"),
    listening_time: findColumnIndex("listening time"),
    date: findColumnIndex("date"),
  };

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

  const optionalMappings = {
    isrc: findColumnIndex("isrc"),
    album: findColumnIndex("album title"),
    ip_address: findColumnIndex("ip address"),
    platform_name: findColumnIndex("platform name"),
    platform_model: findColumnIndex("platform model"),
  };

  Object.entries(optionalMappings).forEach(([key, value]) => {
    if (value !== undefined) {
      (mapping as any)[key] = value;
    }
  });

  return mapping;
}

// Maps a single Excel row to a DeezerListen object using the provided column mapping
function mapExcelRowToDeezerListen(
  row: any,
  mapping: ColumnMapping
): DeezerListen {
  const getValue = (colNumber: number | undefined): any => {
    if (!colNumber) return undefined;
    // prefer row.getCell which is safer and consistent across exceljs versions
    try {
      const cell = row.getCell(colNumber);
      const val = cell ? cell.value : undefined;
      return val === null || val === undefined ? undefined : val;
    } catch {
      // fallback to row.values (1-based) if getCell not available
      if (
        row.values &&
        Array.isArray(row.values) &&
        row.values.length > colNumber
      ) {
        const val = row.values[colNumber];
        return val !== null && val !== undefined ? val : undefined;
      }
      return undefined;
    }
  };

  const deezerListen: DeezerListen = {
    title: String(getValue(mapping.title) ?? "").trim(),
    artist: String(getValue(mapping.artist) ?? "").trim(),
    listening_time: getValue(mapping.listening_time),
    date: getValue(mapping.date),
    isrc: getValue(mapping.isrc),
    album: getValue(mapping.album),
    ip_address: getValue(mapping.ip_address),
    platform_name: getValue(mapping.platform_name),
    platform_model: getValue(mapping.platform_model),
  };

  return deezerListen;
}

// Streams Deezer listening history from an Excel file in batches
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

  let worksheetReader: any = null;

  try {
    // Required columns to identify Deezer listening history
    const requiredColumns = ["Song Title", "Artist", "Listening Time", "Date"];

    // Find the sheet containing Deezer listening data
    const sheetInfo = await findSheetByColumns(workbook, requiredColumns);
    if (!sheetInfo) {
      throw new Error(
        `No sheet with Deezer listening history found in ${filePath}`
      );
    }

    const { worksheet, headers } = sheetInfo;
    worksheetReader = worksheet; // Keep reference for cleanup
    const mapping = createColumnMapping(headers);

    let currentBatch: DeezerListen[] = [];
    let rowCount = 0;
    let processedCount = 0;
    let skippedCount = 0;

    console.log(
      `[deezer-utils] Processing Deezer Excel with column mapping:`,
      mapping
    );
    console.log(`[deezer-utils] Available columns: ${headers.join(", ")}`);

    // Stream rows from the worksheet one by one
    for await (const row of worksheetReader) {
      rowCount++;

      // Skip header row (first row)
      if (rowCount === 1) continue;

      // Map raw Excel row to DeezerListen object
      const deezerListen = mapExcelRowToDeezerListen(row, mapping);

      // Basic validation - skip rows missing essential data
      if (!deezerListen.title || !deezerListen.artist) {
        skippedCount++;
        continue;
      }

      currentBatch.push(deezerListen);
      processedCount++;

      // Yield batch when size limit is reached
      if (currentBatch.length >= batchSize) {
        yield currentBatch;
        currentBatch = [];
      }
    }

    // Yield final batch if not empty
    if (currentBatch.length > 0) {
      yield currentBatch;
    }

    console.log(
      `[deezer-utils] Completed processing ${
        rowCount - 1
      } rows: ${processedCount} valid, ${skippedCount} skipped`
    );
    console.log(
      `[deezer-utils] Missing optional columns: ${getMissingColumns(
        mapping,
        headers
      )}`
    );
  } finally {
    // Resource cleanup - responsibility of streamDeezerExcelRows
    try {
      if (worksheetReader) {
        // Cleanup worksheet reader if available
        worksheetReader.destroy?.();
      }
    } catch (error) {
      console.warn("[deezer-utils] Warning during worksheet cleanup:", error);
    }

    // ExcelJS WorkbookReader doesn't have explicit destroy method
    // The stream will be automatically garbage collected
  }
}

// Identifies which optional columns are missing from the mappings
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

export interface SheetDetectionResult {
  worksheet: any;
  headers: string[];
}

// Scans the workbook for a sheet containing all required columns (case-insensitive, partial match)
export async function findSheetByColumns(
  workbook: Excel.stream.xlsx.WorkbookReader,
  requiredColumns: string[]
): Promise<SheetDetectionResult | null> {
  for await (const worksheet of workbook) {
    const worksheetReader = worksheet as any;
    let firstRow = null;
    for await (const row of worksheetReader) {
      firstRow = row;
      break;
    }
    if (firstRow && firstRow.values) {
      // Build headers array using cells (preserve column numbers)
      const headers: string[] = [];
      // firstRow.eachCell might exist; else fallback to row.values
      if (typeof firstRow.eachCell === "function") {
        firstRow.eachCell((cell: any, colNumber: number) => {
          if (cell && cell.value !== null && cell.value !== undefined) {
            headers[colNumber - 1] = String(cell.value).trim();
          }
        });
      } else {
        // fallback: row.values is 1-based array
        Object.keys(firstRow.values).forEach((k) => {
          const idx = Number(k);
          if (!isNaN(idx)) {
            const val = firstRow.values[idx];
            if (val !== null && val !== undefined)
              headers[idx - 1] = String(val).trim();
          }
        });
      }

      const cleanedHeaders = headers.filter((h) => !!h);
      const hasAllRequired = requiredColumns.every((requiredCol) =>
        cleanedHeaders.some((header) =>
          header.toLowerCase().includes(requiredCol.toLowerCase())
        )
      );

      if (hasAllRequired) {
        return {
          worksheet: worksheetReader,
          headers: cleanedHeaders,
        };
      }
    }
  }

  return null;
}
