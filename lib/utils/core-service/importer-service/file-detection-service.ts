import * as XLSX from 'xlsx'
import { CanonicalListen, SpotifyListen } from '../../../../types/imports-types'
import { findSheetByColumns } from './deezer-service'

type FileType = 'spotify-json' | 'deezer-excel' | 'canonical-json'

// Main function to detect file type
export async function detectFileType(file: File): Promise<FileType> {
  const ext = (file.name.toLowerCase().split('.').pop() ?? '').trim()

  // Try Excel detection for .xlsx/.xls
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })

      const requiredColumns = ['Song Title', 'Artist', 'Listening Time', 'Date']
      const sheetInfo = findSheetByColumns(workbook, requiredColumns)
      if (sheetInfo) return 'deezer-excel'
    } catch (error) {
      console.warn(
        `[file-detection] Not a valid Excel file or failed to read workbook: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      // Continue to JSON detection
    }
  }

  // Detect JSON files
  if (ext === 'json' || ext === '') {
    const text = await file.text()
    const trimmed = text.trim()
    if (!trimmed) throw new Error(`Empty JSON file: ${file.name}`)

    let obj: any
    try {
      obj = JSON.parse(trimmed) // Parse tout le fichier
    } catch (err) {
      throw new Error(`Invalid JSON in ${file.name}: ${err}`)
    }

    // Si c'est un tableau, on prend le premier élément pour détecter le type
    const sample = Array.isArray(obj) ? obj[0] : obj

    if (!sample) throw new Error(`Empty JSON array in ${file.name}`)

    if (isSpotifyListen(sample)) return 'spotify-json'
    if (isCanonicalListen(sample)) return 'canonical-json'

    throw new Error(`Unknown JSON format in ${file.name}`)
  }

  throw new Error(`Cannot detect file type for: ${file.name}`)
}

// Type guard for SpotifyListen format
export function isSpotifyListen(obj: unknown): obj is SpotifyListen {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as any
  return (
    'master_metadata_track_name' in o &&
    'master_metadata_album_artist_name' in o &&
    'spotify_track_uri' in o &&
    'ts' in o &&
    'ms_played' in o
  )
}

// Type guard for CanonicalListen format
export function isCanonicalListen(obj: unknown): obj is CanonicalListen {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as any

  if (!('ts' in o) || !('ms_played' in o)) return false
  if (!o.track || typeof o.track !== 'object') return false
  if (typeof o.track.title !== 'string') return false
  if (!Array.isArray(o.track.artists) || o.track.artists.length === 0) return false

  const firstArtist = o.track.artists[0]
  if (!firstArtist || typeof firstArtist !== 'object') return false
  if (!('name' in firstArtist)) return false

  return true
}
