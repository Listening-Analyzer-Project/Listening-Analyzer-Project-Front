export type DatePrecision = 'year' | 'month' | 'day' | 'second' | 'auto'

export function formatDate(
  input?: string | number | Date | null,
  precision: DatePrecision = 'auto',
  separator: string = '/'
): string {
  if (input === undefined || input === null || input === '') return 'N/A'

  // Helper to zero-pad numbers
  const z = (n: number) => String(n).padStart(2, '0')

  // Parse string patterns first
  if (typeof input === 'string') {
    const s = input.trim()

    // Year only: "YYYY"
    const yMatch = /^(\d{4})$/.exec(s)
    if (yMatch) {
      if (precision === 'month' || precision === 'day' || precision === 'second') {
        // If forced to higher precision but we only have year, return year (can't fabricate)
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
      if (precision === 'month' || precision === 'auto') return `${m}${separator}${y}` // "MM/AAAA"
      return `${m}${separator}${y}`
    }

    // Year-month-day: "YYYY-MM-DD" or "YYYY/MM/DD"
    const ymdMatch = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s)
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
      if (precision === 'second') return `${day}${separator}${month}${separator}${year}`
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

  const day = z(date.getDate())
  const month = z(date.getMonth() + 1)
  const year = String(date.getFullYear())
  const hour = z(date.getHours())
  const minute = z(date.getMinutes())
  const second = z(date.getSeconds())

  if (precision === 'year') return year
  if (precision === 'month') return `${month}${separator}${year}`
  if (precision === 'day') return `${day}${separator}${month}${separator}${year}`
  if (precision === 'second')
    return `${day}${separator}${month}${separator}${year} ${hour}:${minute}:${second}`

  // precision === 'auto' -> decide based on whether time component exists
  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0

  return hasTime
    ? `${day}${separator}${month}${separator}${year} ${hour}:${minute}:${second}`
    : `${day}${separator}${month}${separator}${year}`
}
