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
}