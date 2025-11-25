import * as XLSX from 'xlsx'

export interface SheetDetectionResult {
  worksheet: XLSX.WorkSheet
  headers: string[]
}

/**
 * Scans the workbook for a sheet containing all required columns (case-insensitive, partial match)
 */
export function findSheetByColumns(
  workbook: XLSX.WorkBook,
  requiredColumns: string[]
): SheetDetectionResult | null {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    // Convert the first row to array of values
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 })
    if (!rows || rows.length === 0) continue

    const firstRow = rows[0]
    if (!firstRow) continue

    const headers = firstRow
      .map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : null))
      .filter((h) => !!h) as string[]

    const hasAllRequired = requiredColumns.every((requiredCol) =>
      headers.some((header) => header.toLowerCase().includes(requiredCol.toLowerCase()))
    )

    if (hasAllRequired) {
      return {
        worksheet,
        headers,
      }
    }
  }

  return null
}
