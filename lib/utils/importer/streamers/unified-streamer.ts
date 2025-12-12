import * as XLSX from 'xlsx'

import { showErrorToast } from '@/lib/utils'
import { CanonicalListen } from '../../../../types/imports-types'
import { validateCanonicalListen } from '../parsers/canonical-validator'
import { parseDeezerListen } from '../parsers/deezer-parser'
import { parseSpotifyListen } from '../parsers/spotify-parser'
import { findSheetByColumns } from '../services/deezer-service'
import { detectFileType } from '../services/file-detection-service'

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
      showErrorToast(error, `Cannot detect file type for ${file.name}`)
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
          showErrorToast(`Unknown file type for ${file.name}`, 'Unknown file type')
          break
      }
    } catch (err) {
      showErrorToast(err, `Error while reading ${file.name}`)
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
    showErrorToast(err, `Invalid JSON in ${file.name}`)
    return
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

  const sheetInfo = await findSheetByColumns(workbook, requiredColumns)
  console.log(sheetInfo)

  if (!sheetInfo) {
    showErrorToast(`No sheet with Deezer listening history found in ${file.name}`, "Format Deezer invalide")
    return
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
