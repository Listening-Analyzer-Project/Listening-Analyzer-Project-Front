import fs from 'fs'
import readline from 'readline'
import { CanonicalListen } from '../../../../types/imports-types'
import { validateCanonicalListen } from '../parsers/canonical-validator'
import { parseDeezerListen } from '../parsers/deezer-parser'
import { parseSpotifyListen } from '../parsers/spotify-parser'
import { streamDeezerExcelRows } from '../services/deezer-service'
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

// Main unified streamer function
export async function* parseAndBatch(
  filePaths: string[],
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

  for (const filePath of filePaths) {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch {
      console.warn(`[unified-streamer] File not found or not readable: ${filePath} — skipping`)
      continue
    }

    let fileType: 'spotify-json' | 'deezer-excel' | 'canonical-json'
    try {
      fileType = await detectFileType(filePath)
    } catch (error) {
      console.warn(
        `[unified-streamer] Cannot detect file type for ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        } — skipping`
      )
      continue
    }

    console.info(`[unified-streamer] Processing ${fileType}: ${filePath}`)

    try {
      switch (fileType) {
        case 'spotify-json':
          yield* processJsonFile(filePath, reqOpts, stats, parseSpotifyListen)
          break
        case 'canonical-json':
          yield* processJsonFile(filePath, reqOpts, stats, validateCanonicalListen)
          break
        case 'deezer-excel':
          yield* processDeezerFile(filePath, reqOpts, stats)
          break
        default:
          console.warn(`[unified-streamer] Unknown file type for ${filePath} — skipping`)
      }
    } catch (err) {
      console.error(`[unified-streamer] Error while reading ${filePath}:`, err)
      if (!skipInvalidLines) throw err
    }
  }

  console.info(
    `[unified-streamer] Done - Files: ${filePaths.length}, Total Lines: ${stats.totalLines}, Accepted: ${stats.accepted}, Rejected: ${stats.rejected}`
  )
}

// Read JSON file line by line, parse each line, filter, batch and yield
async function* processJsonFile(
  filePath: string,
  opts: RequiredOpts,
  stats: Stats,
  parser: (raw: any) => CanonicalListen | null
): AsyncGenerator<CanonicalListen[], void, void> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let batch: CanonicalListen[] = []

  try {
    for await (const line of rl) {
      stats.totalLines++
      if (!line || !line.trim()) continue

      let raw: any
      try {
        raw = JSON.parse(line)
      } catch (err) {
        stats.rejected++
        if (!opts.skipInvalidLines) {
          rl.close()
          stream.destroy()
          throw new Error(`Invalid JSON on line ${stats.totalLines} of ${filePath}: ${String(err)}`)
        }
        if (opts.logEvery && stats.totalLines % opts.logEvery === 0) {
          console.warn(
            `[unified-streamer] Invalid JSON count=${stats.rejected} (line ${stats.totalLines})`
          )
        }
        continue
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

      if (opts.logEvery && stats.totalLines % opts.logEvery === 0) {
        console.log(
          `[unified-streamer] Processed lines=${stats.totalLines} accepted=${stats.accepted} rejected=${stats.rejected}`
        )
      }
    }

    if (batch.length > 0) yield batch
  } finally {
    try {
      rl.close()
    } catch {}
    try {
      stream.destroy()
    } catch {}
  }
}

// Process Deezer Excel file, parse, filter, batch and yield
async function* processDeezerFile(
  filePath: string,
  opts: RequiredOpts,
  stats: Stats
): AsyncGenerator<CanonicalListen[], void, void> {
  // streamDeezerExcelRows yields DeezerListen[] batches
  for await (const deezerBatch of streamDeezerExcelRows(filePath, opts.batchSize)) {
    // Count input lines (approximatif : une row = 1 ligne de données)
    stats.totalLines += deezerBatch.length

    const converted: CanonicalListen[] = []
    for (const raw of deezerBatch) {
      const canonical = parseDeezerListen(raw)
      if (!canonical) {
        stats.rejected++
        continue
      }
      if (typeof canonical.ms_played !== 'number' || canonical.ms_played < opts.minMsPlayed) {
        stats.rejected++
        continue
      }
      converted.push(canonical)
    }

    stats.accepted += converted.length

    if (converted.length > 0) {
      // Note: streamDeezerExcelRows already yields in "batch" chunks, but we still ensure we don't exceed opts.batchSize
      if (converted.length <= opts.batchSize) {
        yield converted
      } else {
        // split if necessary
        for (let i = 0; i < converted.length; i += opts.batchSize) {
          yield converted.slice(i, i + opts.batchSize)
        }
      }
    }

    if (opts.logEvery && stats.totalLines % opts.logEvery === 0) {
      console.log(
        `[unified-streamer] Processed lines=${stats.totalLines} accepted=${stats.accepted} rejected=${stats.rejected}`
      )
    }
  }
}
