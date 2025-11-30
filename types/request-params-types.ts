//TODO : Nom du fichier pas approprié structuration des types à revoir

export interface TablesBaseParams {
    search?: string
    order_by?: string
    order_dir?: 'asc' | 'desc'
    limit?: number
    offset?: number
}

export interface ListensParams extends TablesBaseParams {
    end_date?: string
    start_date?: string
    platform?: string
    is_valid?: boolean
    track_id?: string
}

export interface ColumnOption {
    key: string
    label: string
    description?: string
    sortable?: boolean
    defaultVisible?: boolean // Si true ou undefined, la colonne est visible par défaut
}

export type ViewType = 'listens' | 'tracks' | 'artists' | 'albums'
export type SortDirection = 'asc' | 'desc'
export type RenderType = 'timestamp' | 'date' | 'title' | 'text' | 'rank' | 'duration' | 'badge' | 'boolean' | 'number' | 'validListens' | 'invalidListens'
