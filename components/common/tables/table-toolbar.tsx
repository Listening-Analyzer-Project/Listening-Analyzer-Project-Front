'use client'

import React from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ColumnOption } from '@/types'
import AdvancedSearch from '../others/advanced-search'
import ColumnSelector from './column-selector'

interface TableToolbarProps {
  onSearch: (query: string) => void 
  rowsPerPage: number
  onRowsPerPageChange: (n: number) => void
  loading?: boolean
  optionalSlot?: React.ReactNode
  availableColumns?: ColumnOption[]
  visibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void
  onSuggestionQueryChange: (query: string) => void
  suggestions: string[]
  suggestionsLoading: boolean
  resetKey?: string | number
}

export function TableToolbar({
  onSearch,
  rowsPerPage,
  onRowsPerPageChange,
  loading = false,
  optionalSlot: optionalSlot = null,
  availableColumns,
  visibleColumns,
  onVisibleColumnsChange,
  onSuggestionQueryChange,
  suggestions,
  suggestionsLoading,
  resetKey
}: TableToolbarProps) {
  const showColumnSelector = availableColumns && visibleColumns && onVisibleColumnsChange

  return (
    <div className="flex flex-col gap-4 mb-6 p-2 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AdvancedSearch 
            key={resetKey}
            onSearchChange={onSearch}
            onSuggestionQueryChange={onSuggestionQueryChange}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            loading={loading}
          />

          <Select
            value={String(rowsPerPage)}
            onValueChange={value => onRowsPerPageChange(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="w-[150px] rounded-md flex-shrink-0">
              <SelectValue placeholder={`${rowsPerPage} per page`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 per page</SelectItem>
              <SelectItem value="500">500 per page</SelectItem>
              <SelectItem value="1000">1000 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          {showColumnSelector && (
              <ColumnSelector
                availableColumns={availableColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={onVisibleColumnsChange}
              />
            )}
          {optionalSlot}
        </div>
      </div>
    </div>
  )
}

export default TableToolbar