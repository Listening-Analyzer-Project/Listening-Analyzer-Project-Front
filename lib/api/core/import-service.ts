import { parseAndBatch } from '@/lib/utils/importer/streamers/unified-streamer'
import apiClient from '../api-clients'

export type ParsedFileResult = {
  filename: string
  status: string
  data?: any
}

export const fileService = {
  /**
   * Upload des fichiers pour parsing côté serveur.
   * @param files Liste de fichiers sélectionnés par l'utilisateur
   */
  uploadAndParse: async (files: File[]) => {
    if (files.length === 0) return []
    //const parsed = await parseAndBatch(files.map(f => f.name))
    // const formData = new FormData()
    // files.forEach(file => formData.append('files', file))

    // const result = await apiClient.post<ParsedFileResult[]>('/api/files/parse', formData, {
    //   headers: {
    //     'Content-Type': 'multipart/form-data',
    //   },
    // })

    // return result
  },
}

export default fileService
