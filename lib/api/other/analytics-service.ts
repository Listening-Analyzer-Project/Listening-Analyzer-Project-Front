import { ListensParams, TablesBaseParams } from '@/types/request-params-types'
import apiClient from '../api-clients'
import { FAlbumAnalytics, FArtistAnalytics, FListenAnalytics, FTrackAnalytics } from '@/types/specific-analytics-types'



export const analyticsService = {
    getListens: (params: ListensParams) => {
        return apiClient.get<FListenAnalytics[]>('/api/analytics/listens', { query: params as any })
    },

    getTracks: (params: TablesBaseParams) => {
        return apiClient.get<FTrackAnalytics[]>('/api/analytics/tracks', { query: params as any })
    },

    getArtists: (params: TablesBaseParams) => {
        return apiClient.get<FArtistAnalytics[]>('/api/analytics/artists', { query: params as any })
    },

    getAlbums: (params: TablesBaseParams) => {
        return apiClient.get<FAlbumAnalytics[]>('/api/analytics/albums', { query: params as any })
    },
}

export default analyticsService
