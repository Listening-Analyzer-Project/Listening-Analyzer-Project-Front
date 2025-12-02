import { userService } from '@/lib/api'
import { USER_UPDATED_EVENT } from '@/lib/events'
import { showErrorToast } from '@/lib/utils'
import { parseAndBatch } from '@/lib/utils/importer/streamers/unified-streamer'
import { FUser } from '@/types'
import apiClient from '../api-clients'

export type ParsedFileResult = {
  filename: string
  status: string
  data?: any
}

export const importService = {
  /**
   * Upload et parse les fichiers côté front, envoie batch par batch au serveur,
   * attend la réponse pour chaque batch, et cumule les résultats.
   */
  uploadAndParse: async (files: File[], user: FUser, onProgress?: (percent: number) => void) => {
    if (files.length === 0) return null

    if (user.syncro_status === 1) return null
    showErrorToast("User's data is already being imported", 'Import failed')

    const payload = {
      name: user.name,
      type: user.type,
      isadmin: user.isadmin,
      syncro_status: 1,
    }
    await userService.update(user.id?.toString() || '', payload)
    window.dispatchEvent(new Event(USER_UPDATED_EVENT))

    const cumulativeResult = {
      totalListens: 0,
      existingTrackGroups: 0,
      newTrackGroups: 0,
      insertedGenres: 0,
      insertedSubGenres: 0,
      insertedAlbums: 0,
      insertedArtists: 0,
      insertedTags: 0,
      insertedTracks: 0,
      insertedTrackArtists: 0,
      insertedTrackTags: 0,
      insertedListens: 0,
    }

    if (user.syncro_status !== 0) {
      await userService.remove(user.id?.toString() || '', false)
    }

    await importService.dropIndexes()

    for await (const batch of parseAndBatch(files, { batchSize: 10000, onProgress })) {
      try {
        // apiClient.post renvoie directement les données JSON
        const r = await apiClient.post<typeof cumulativeResult>(`/api/import?id=${user.id}`, batch)

        // Cumuler les résultats
        cumulativeResult.totalListens += r.totalListens
        cumulativeResult.existingTrackGroups += r.existingTrackGroups
        cumulativeResult.newTrackGroups += r.newTrackGroups
        cumulativeResult.insertedGenres += r.insertedGenres
        cumulativeResult.insertedSubGenres += r.insertedSubGenres
        cumulativeResult.insertedAlbums += r.insertedAlbums
        cumulativeResult.insertedArtists += r.insertedArtists
        cumulativeResult.insertedTags += r.insertedTags
        cumulativeResult.insertedTracks += r.insertedTracks
        cumulativeResult.insertedTrackArtists += r.insertedTrackArtists
        cumulativeResult.insertedTrackTags += r.insertedTrackTags
        cumulativeResult.insertedListens += r.insertedListens

      } catch (err) {
        console.error('Erreur lors de l’envoi du batch:', err)
        showErrorToast(err, 'API request failed')
      }
    }

    payload.syncro_status = 2
    await userService.update(user.id?.toString() || '', payload)
    window.dispatchEvent(new Event(USER_UPDATED_EVENT))

    await importService.restoreIndexes()

    console.log('Résultat cumulé de tous les batches:', cumulativeResult)
    return cumulativeResult
  },

  dropIndexes: async () => {
    await apiClient.post<void>('/api/import/drop-indexes')
  },

  restoreIndexes: async () => {
    await apiClient.post<void>('/api/import/create-indexes')
  },
}

export default importService
