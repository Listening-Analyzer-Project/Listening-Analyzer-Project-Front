import { parseAndBatch } from '@/lib/utils/importer/streamers/unified-streamer'
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
  uploadAndParse: async (files: File[], userId: number) => {
    if (files.length === 0) return null

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

    await importService.dropIndexes()

    for await (const batch of parseAndBatch(files, { batchSize: 10000 })) {
        try {
            // apiClient.post renvoie directement les données JSON
            const r = await apiClient.post<typeof cumulativeResult>(`/api/import?id=${userId}`, batch)

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
            // tu peux décider de continuer ou de throw pour stopper
        }
    }

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
