import { useEffect, useState } from 'react'
import { COLUMNS_BY_VIEW } from '@/lib/constants'

const STORAGE_KEY = 'data-table-visible-columns'

/**
 * Get the default visible columns configuration
 */
const getDefaultVisibleColumns = (): Record<string, string[]> => {
    return Object.keys(COLUMNS_BY_VIEW).reduce((acc, viewType) => {
        acc[viewType] = COLUMNS_BY_VIEW[viewType].map((col) => col.key)
        return acc
    }, {} as Record<string, string[]>)
}

/**
 * Load visible columns from localStorage
 */
const loadVisibleColumnsFromStorage = (): Record<string, string[]> | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.error('Failed to load visible columns from localStorage:', error)
    }
    return null
}

/**
 * Save visible columns to localStorage
 */
const saveVisibleColumnsToStorage = (visibleColumns: Record<string, string[]>): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns))
    } catch (error) {
        console.error('Failed to save visible columns to localStorage:', error)
    }
}

/**
 * Custom hook to manage column visibility with localStorage persistence
 */
export const useColumnVisibility = () => {
    // Always initialize with default values to prevent hydration mismatch
    const [visibleColumns, setVisibleColumns] = useState<Record<string, string[]>>(
        getDefaultVisibleColumns
    )

    useEffect(() => {
        const stored = loadVisibleColumnsFromStorage()
        if (stored) {
            setVisibleColumns(stored)
        }
    }, [])

    useEffect(() => {
        saveVisibleColumnsToStorage(visibleColumns)
    }, [visibleColumns])

    // Update visible columns for a specific view type
    const updateVisibleColumns = (viewType: string, columns: string[]) => {
        setVisibleColumns((prev) => ({
            ...prev,
            [viewType]: columns,
        }))
    }

    return {
        visibleColumns,
        updateVisibleColumns,
    }
}
