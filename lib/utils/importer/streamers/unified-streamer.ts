import * as XLSX from 'xlsx'
import { CanonicalListen } from '../../../../types/imports-types'
import { validateCanonicalListen } from '../parsers/canonical-validator'
import { parseDeezerListen } from '../parsers/deezer-parser'
import { parseSpotifyListen } from '../parsers/spotify-parser'
import { detectFileType } from '../services/file-detection-service'

export type StreamOptions = {
  batchSize?: number
  skipInvalidLines?: boolean
  logEvery?: number | null
  minMsPlayed?: number
}

type RequiredOpts = Required<
  Pick<StreamOptions, 'batchSize' | 'skipInvalidLines' | 'logEvery' | 'minMsPlayed'>
>

type Stats = { totalLines: number; accepted: number; rejected: number }

export async function* parseAndBatch(
  files: File[],
  opts: StreamOptions = {}
): AsyncGenerator<CanonicalListen[], void, void> {
  const { batchSize = 1000, skipInvalidLines = true, logEvery = 10000, minMsPlayed = 0 } = opts

  const reqOpts: RequiredOpts = {
    batchSize,
    skipInvalidLines,
    logEvery,
    minMsPlayed,
  }
  const stats: Stats = { totalLines: 0, accepted: 0, rejected: 0 }

  for (const file of files) {
    let fileType: 'spotify-json' | 'deezer-excel' | 'canonical-json'
    try {
      fileType = await detectFileType(file)
    } catch (error) {
      console.warn(
        `[unified-streamer] Cannot detect file type for ${file.name}: ${
          error instanceof Error ? error.message : String(error)
        } — skipping`
      )
      continue
    }

    console.info(`[unified-streamer] Processing ${fileType}: ${file.name}`)

    try {
      switch (fileType) {
        case 'spotify-json':
          yield* processJsonFile(file, reqOpts, stats, parseSpotifyListen)
          break
        case 'canonical-json':
          yield* processJsonFile(file, reqOpts, stats, validateCanonicalListen)
          break
        case 'deezer-excel':
          yield* processDeezerFile(file, reqOpts, stats)
          break
        default:
          console.warn(`[unified-streamer] Unknown file type for ${file.name} — skipping`)
      }
    } catch (err) {
      console.error(`[unified-streamer] Error while reading ${file.name}:`, err)
      if (!skipInvalidLines) throw err
    }
  }

  console.info(
    `[unified-streamer] Done - Files: ${files.length}, Total Lines: ${stats.totalLines}, Accepted: ${stats.accepted}, Rejected: ${stats.rejected}`
  )
}

async function* processJsonFile(
  file: File,
  opts: RequiredOpts,
  stats: Stats,
  parser: (raw: any) => CanonicalListen | null
): AsyncGenerator<CanonicalListen[], void, void> {
  const content = await file.text()
  let rows: any[]
  try {
    const obj = JSON.parse(content)
    rows = Array.isArray(obj) ? obj : [obj] // si c'est un objet unique
  } catch (err) {
    throw new Error(`Invalid JSON in ${file.name}: ${err}`)
  }

  let batch: CanonicalListen[] = []

  for (const raw of rows) {
    stats.totalLines++
    
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

    if (opts.logEvery && stats.totalLines % opts.logEvery === 0) {
      console.log(
        `[unified-streamer] Processed lines=${stats.totalLines} accepted=${stats.accepted} rejected=${stats.rejected}`
      )
    }
  }

  if (batch.length > 0) yield batch
}

async function* processDeezerFile(
  file: File,
  opts: RequiredOpts,
  stats: Stats
): AsyncGenerator<CanonicalListen[], void, void> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  // Convertir la feuille en JSON (tableau d'objets)
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null })

  stats.totalLines += rawRows.length

  let batch: CanonicalListen[] = []

  for (const raw of rawRows) {
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

  if (opts.logEvery) {
    console.log(
      `[unified-streamer] Processed Deezer file ${file.name} - Total Lines=${stats.totalLines}, Accepted=${stats.accepted}, Rejected=${stats.rejected}`
    )
  }
}

