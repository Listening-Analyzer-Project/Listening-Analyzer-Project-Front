export function normalizeDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  // If it's already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  // If it's a number (Excel date, timestamp, etc.)
  if (typeof value === "number") {
    // Large numbers are likely timestamps in ms
    if (value > 1e12) return new Date(value).toISOString();
    // Medium numbers are likely timestamps in seconds
    if (value > 1e9) return new Date(Math.round(value * 1000)).toISOString();
    // Small numbers are likely Excel dates (days since 1899-12-30)
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + Math.round(value * 86400000);
    return new Date(ms).toISOString();
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Try direct Date.parse first
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return new Date(parsed).toISOString();

    // Try common date formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      // YYYY/MM/DD
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    ];

    for (const format of formats) {
      if (format.test(trimmed)) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date.toISOString();
      }
    }
  }

  return null;
}
