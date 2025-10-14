import Excel from "exceljs";
import { promises as fsPromises } from "fs";
import { findSheetByColumns } from "./excel-utils";
import { isCanonicalListen, isSpotifyListen } from "./type-guards";

export async function detectFileType(
  filePath: string
): Promise<"spotify-json" | "deezer-excel" | "canonical-json"> {
  const ext = filePath.toLowerCase().split(".").pop();

  if (ext === "xlsx" || ext === "xls") {
    try {
      const workbook = new Excel.stream.xlsx.WorkbookReader(filePath, {});

      const requiredColumns = [
        "Song Title",
        "Artist",
        "Listening Time",
        "Date",
      ];
      const sheetInfo = await findSheetByColumns(workbook, requiredColumns);
      if (sheetInfo) {
        return "deezer-excel";
      }
    } catch (error) {
      console.warn(
        `[file-detector] Not a valid Excel file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (ext === "json") {
    const fileHandle = await fsPromises.open(filePath, "r");
    const buffer = Buffer.alloc(1024); // Read first 1KB
    const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
    await fileHandle.close();

    const content = buffer.toString("utf-8", 0, bytesRead);

    // Find the FIRST non-empty line
    const firstNonEmptyLine = content.split("\n").find((line) => line.trim());

    if (!firstNonEmptyLine) {
      throw new Error(`Empty JSON file: ${filePath}`);
    }

    try {
      const obj = JSON.parse(firstNonEmptyLine);

      if (isSpotifyListen(obj)) {
        return "spotify-json";
      }

      if (isCanonicalListen(obj)) {
        return "canonical-json";
      }
    } catch (error) {
      throw new Error(
        `Invalid JSON in first line of ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    throw new Error(`Unknown JSON format in ${filePath}`);
  }

  throw new Error(`Cannot detect file type for: ${filePath}`);
}
