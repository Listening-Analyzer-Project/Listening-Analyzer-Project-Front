//TODO : Nom du fichier pas approprié structuration des types à revoir

export interface TablesBaseParams {
    search?: string
    order_by?: string
    order_dir?: 'asc' | 'desc'
    limit?: number
    offset?: number
    user_ids?: string
}

export interface ListensParams extends TablesBaseParams {
    end_date?: string
    start_date?: string
    platform?: string
    is_valid?: boolean
    track_id?: string
}

export interface SuggestionsParams {
    search?: string
    view_type?: ViewType
    limit?: number
}

export interface ColumnOption {
    key: string
    label: string
    description?: string
    sortable?: boolean
    defaultVisible?: boolean // Si true ou undefined, la colonne est visible par défaut
}

export interface EventParams {
    user_ids?: string
    category_id?: string
    limit?: number
    offset?: number
}

export type ViewType = 'listens' | 'tracks' | 'artists' | 'albums'
export type SortDirection = 'asc' | 'desc'
export type RenderType = 'timestamp' | 'date' | 'title' | 'text' | 'album' | 'rank' | 'duration' | 'badges' | 'boolean' | 'number' | 'validListens' | 'invalidListens'
