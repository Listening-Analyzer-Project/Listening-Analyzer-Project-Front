import * as XLSX from 'xlsx'
import { CanonicalListen } from '@/types/imports-types'
import { validateCanonicalListen } from '../parsers/canonical-validator'
import { parseDeezerListen } from '../parsers/deezer-parser'
import { parseSpotifyListen } from '../parsers/spotify-parser'
import { detectFileType } from '../../core-service'

export type StreamOptions = {
  batchSize?: number
  skipInvalidLines?: boolean
  logEvery?: number | null
  minMsPlayed?: number
  onProgress?: (progress: number) => void
}

type RequiredOpts = Required<
  Pick<StreamOptions, 'batchSize' | 'skipInvalidLines' | 'logEvery' | 'minMsPlayed'>
> & { onProgress?: (progress: number) => void }

type Stats = { totalLines: number; accepted: number; rejected: number }

export async function* parseAndBatch(
  files: File[],
  opts: StreamOptions = {}
): AsyncGenerator<CanonicalListen[], void, void> {
  const { batchSize = 1000, skipInvalidLines = true, logEvery = 10000, minMsPlayed = 0, onProgress } = opts

  const reqOpts: RequiredOpts = {
    batchSize,
    skipInvalidLines,
    logEvery,
    minMsPlayed,
    onProgress
  }
  const stats: Stats = { totalLines: 0, accepted: 0, rejected: 0 }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0)
  let processedBytes = 0

  const reportProgress = (bytes: number) => {
    if (onProgress && totalBytes > 0) {
      const percent = Math.min(100, Math.round((bytes / totalBytes) * 100))
      onProgress(percent)
    }
  }

  for (const file of files) {
    let fileType: 'spotify-json' | 'deezer-excel' | 'canonical-json'
    try {
      fileType = await detectFileType(file)
    } catch (error) {
      console.warn(
        `[unified-streamer] Cannot detect file type for ${file.name}: ${error instanceof Error ? error.message : String(error)
        } — skipping`
      )
      // Even if skipped, we count it as processed for progress bar
      processedBytes += file.size
      reportProgress(processedBytes)
      continue
    }

    try {
      const fileProgressCallback = (bytesProcessedInFile: number) => {
        reportProgress(processedBytes + bytesProcessedInFile)
      }

      switch (fileType) {
        case 'spotify-json':
          yield* processJsonFile(file, reqOpts, stats, parseSpotifyListen, fileProgressCallback)
          break
        case 'canonical-json':
          yield* processJsonFile(file, reqOpts, stats, validateCanonicalListen, fileProgressCallback)
          break
        case 'deezer-excel':
          yield* processDeezerFile(file, reqOpts, stats, fileProgressCallback)
          break
        default:
          console.warn(`[unified-streamer] Unknown file type for ${file.name} — skipping`)
      }
    } catch (err) {
      console.error(`[unified-streamer] Error while reading ${file.name}:`, err)
      if (!skipInvalidLines) throw err
    }

    processedBytes += file.size
    reportProgress(processedBytes)
  }

  console.info(
    `[unified-streamer] Done - Files: ${files.length}, Total Lines: ${stats.totalLines}, Accepted: ${stats.accepted}, Rejected: ${stats.rejected}`
  )
}

async function* processJsonFile(
  file: File,
  opts: RequiredOpts,
  stats: Stats,
  parser: (raw: any) => CanonicalListen | null,
  onFileProgress: (bytes: number) => void
): AsyncGenerator<CanonicalListen[], void, void> {
  const content = await file.text()
  let rows: any[]
  try {
    const obj = JSON.parse(content)
    rows = Array.isArray(obj) ? obj : [obj] // si c'est un objet unique
  } catch (err) {
    //TODO gérer erreurs
    throw new Error(`Invalid JSON in ${file.name}: ${err}`)
  }

  let batch: CanonicalListen[] = []
  const totalItems = rows.length
  const fileSize = file.size

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    stats.totalLines++

    // Report progress roughly
    if (i % 100 === 0) {
      onFileProgress((i / totalItems) * fileSize)
    }

    if (!raw || typeof raw !== 'object') {
      stats.rejected++
      continue
    }

    const canonical = parser(raw)
    if (!canonical) {
      stats.rejected++
      continue
    }

    if (typeof canonical.ms_played !== 'number' || canonical.ms_played < opts.minMsPlayed) {
      stats.rejected++
      continue
    }

    batch.push(canonical)
    stats.accepted++

    if (batch.length >= opts.batchSize) {
      yield batch
      batch = []
    }
  }

  if (batch.length > 0) yield batch
}

async function* processDeezerFile(
  file: File,
  opts: RequiredOpts,
  stats: Stats,
  onFileProgress: (bytes: number) => void
): AsyncGenerator<CanonicalListen[], void, void> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  // Required columns to identify Deezer listening history
  const requiredColumns = ['Song Title', 'Artist', 'Listening Time', 'Date']

  const sheetInfo = findSheetByColumns(workbook, requiredColumns)

  if (!sheetInfo) {
    console.warn(`[unified-streamer] No sheet with Deezer listening history found in ${file.name}`)
    throw new Error(`No sheet with Deezer listening history found in ${file.name}`) // TODO : géré erreurs  
  }

  const { worksheet, sheetName } = sheetInfo
  console.log(`[unified-streamer] Processing Deezer Excel sheet "${sheetName}"`)

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null })

  stats.totalLines += rawRows.length

  let batch: CanonicalListen[] = []
  const totalItems = rawRows.length
  const fileSize = file.size

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]

    // Report progress roughly
    if (i % 100 === 0) {
      onFileProgress((i / totalItems) * fileSize)
    }

    const canonical = parseDeezerListen(raw)
    if (!canonical) {
      stats.rejected++
      continue
    }
    if (typeof canonical.ms_played !== 'number' || canonical.ms_played < opts.minMsPlayed) {
      stats.rejected++
      continue
    }

    batch.push(canonical)
    stats.accepted++

    if (batch.length >= opts.batchSize) {
      yield batch
      batch = []
    }
  }

  if (batch.length > 0) yield batch
}

function findSheetByColumns(workbook: XLSX.WorkBook, requiredColumns: string[]) {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    // Get headers (first row)
    const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][])[0]

    if (!headers || !Array.isArray(headers)) continue

    const hasAllColumns = requiredColumns.every(col =>
      headers.some(h => h && h.toString().trim().toLowerCase() === col.toLowerCase())
    )

    if (hasAllColumns) {
      return { worksheet, sheetName }
    }
  }
  return null
}
