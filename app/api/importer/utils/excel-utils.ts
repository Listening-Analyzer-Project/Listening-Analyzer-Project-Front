import Excel from "exceljs";

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
      const headers = Object.values(firstRow.values)
        .filter((val) => val !== null && val !== undefined)
        .map((val) => String(val).trim());

      // Check if this sheet contains all required columns
      const hasAllRequiredColumns = requiredColumns.every((requiredCol) =>
        headers.some((header) =>
          header.toLowerCase().includes(requiredCol.toLowerCase())
        )
      );

      if (hasAllRequiredColumns) {
        console.log(
          `[excel-utils] Found matching sheet with headers:`,
          headers
        );
        return {
          worksheet: worksheetReader,
          headers,
        };
      }
    }
  }

  console.log(
    "[excel-utils] No sheet found with required columns:",
    requiredColumns
  );
  return null;
}
