export type DatePrecision = 'year' | 'month' | 'day' | 'minute' | 'second' | 'auto'

export function formatDateToDisplay(
  input?: string | number | Date | null,
  precision: DatePrecision = 'auto',
  separator: string = '/',
  utc: boolean = false
): string {
  if (input === undefined || input === null || input === '') return 'N/A'
  const z = (n: number) => String(n).padStart(2, '0')

  if (typeof input === 'string') {
    const s = input.trim()

    // Year only: "YYYY"
    const yMatch = /^(\d{4})$/.exec(s)
    if (yMatch) {
      if (precision === 'month' || precision === 'day' || precision === 'second' || precision === 'minute') {
        return yMatch[1]
      }
      return yMatch[1]
    }

    // Year-month: "YYYY-MM" or "YYYY/M" or "YYYY-M" etc.
    const ymMatch = /^(\d{4})[-\/](\d{1,2})$/.exec(s)
    if (ymMatch) {
      const y = ymMatch[1]
      const m = z(Number(ymMatch[2]))
      if (precision === 'year') return y
      if (precision === 'month' || precision === 'auto') return `${m}${separator}${y}`
      return `${m}${separator}${y}`
    }

    // Year-month-day: "YYYY-MM-DD" or "YYYY/MM/DD"
    const ymdMatch = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(s)
    if (ymdMatch) {
      const y = Number(ymdMatch[1])
      const m = Number(ymdMatch[2])
      const d = Number(ymdMatch[3])
      const day = z(d)
      const month = z(m)
      const year = String(y)
      if (precision === 'year') return year
      if (precision === 'month') return `${month}${separator}${year}`
      if (precision === 'day' || precision === 'auto')
        return `${day}${separator}${month}${separator}${year}`
      if (precision === 'minute' || precision === 'second') return `${day}${separator}${month}${separator}${year}`
    }

    // If string is parseable as full ISO datetime or other date
    const maybeDate = new Date(s)
    if (!Number.isNaN(maybeDate.getTime())) {
      input = maybeDate
    } else {
      return 'N/A'
    }
  }

  // Now input is number (timestamp) or Date
  const date = typeof input === 'number' ? new Date(input) : (input as Date)
  if (Number.isNaN(date.getTime())) return 'N/A'

  const day = z(utc ? date.getUTCDate() : date.getDate())
  const month = z((utc ? date.getUTCMonth() : date.getMonth()) + 1)
  const year = String(utc ? date.getUTCFullYear() : date.getFullYear())
  const hour = z(utc ? date.getUTCHours() : date.getHours())
  const minute = z(utc ? date.getUTCMinutes() : date.getMinutes())
  const second = z(utc ? date.getUTCSeconds() : date.getSeconds())

  switch (precision) {
    case 'year':
      return year
    case 'month':
      return `${month}${separator}${year}`
    case 'day':
      return `${day}${separator}${month}${separator}${year}`
    case 'minute':
      return `${day}${separator}${month}${separator}${year} ${hour}:${minute}`
    case 'second':
      return `${day}${separator}${month}${separator}${year} ${hour}:${minute}:${second}`
    case 'auto':
      break
  }

  // precision === 'auto' -> decide based on whether time component exists
  const hasTime =
    (utc ? date.getUTCHours() : date.getHours()) !== 0 ||
    (utc ? date.getUTCMinutes() : date.getMinutes()) !== 0 ||
    (utc ? date.getUTCSeconds() : date.getSeconds()) !== 0 ||
    (utc ? date.getUTCMilliseconds() : date.getMilliseconds()) !== 0

  return hasTime
    ? `${day}${separator}${month}${separator}${year} ${hour}:${minute}:${second}`
    : `${day}${separator}${month}${separator}${year}`
}

export function normalizeDate(value: any): string | null {
  if (value === null || value === undefined || value === '') return null

  // If it's already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString()
  }

  // If it's a number (Excel date, timestamp, etc.)
  if (typeof value === 'number') {
    // Large numbers are likely timestamps in ms
    if (value > 1e12) return new Date(value).toISOString()
    // Medium numbers are likely timestamps in seconds
    if (value > 1e9) return new Date(Math.round(value * 1000)).toISOString()
    // Small numbers are likely Excel dates (days since 1899-12-30)
    const excelEpoch = Date.UTC(1899, 11, 30)
    const ms = excelEpoch + Math.round(value * 86400000)
    return new Date(ms).toISOString()
  }

  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const trimmed = value.trim()

    // Try direct Date.parse first
    const parsed = Date.parse(trimmed)
    if (!isNaN(parsed)) return new Date(parsed).toISOString()

    // Try common date formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // DD/MM/YYYY or MM/DD/YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      // YYYY/MM/DD
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    ]

    for (const format of formats) {
      if (format.test(trimmed)) {
        const date = new Date(trimmed)
        if (!isNaN(date.getTime())) return date.toISOString()
      }
    }
  }

  return null
}


export function formatDateForSearch(input: string): string {
  const s = input.trim()

  // Date "DD/MM/YYYY" -> "YYYY-MM-DD"
  const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // Date "DD/MM" -> "MM-DD"
  const dmMatch = /^(\d{1,2})[\/\-](\d{1,2})$/.exec(s)
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0')
    const month = dmMatch[2].padStart(2, '0')
    return `${month}-${day}`
  }

  return s
}
