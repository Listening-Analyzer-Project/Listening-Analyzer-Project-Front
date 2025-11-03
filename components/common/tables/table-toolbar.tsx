'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import React from 'react'

interface TableToolbarProps {
  searchQuery: string
  onSearchQueryChange: (v: string) => void
  onSearch: () => void
  onClearSearch: () => void
  rowsPerPage: number
  onRowsPerPageChange: (n: number) => void
  loading?: boolean
  /**
   * Optional slot: parent can pass any React node to be rendered under the toolbar controls
   */
  optionalSlot?: React.ReactNode
}

export function TableToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  rowsPerPage,
  onRowsPerPageChange,
  loading = false,
  optionalSlot: optionalSlot = null,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 p-2 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Rechercher par titre, artiste..."
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') onSearch()
              }}
              className="pl-3 pr-2 py-2 rounded-md border border-gray-300 focus:ring-0 focus:border-gray-400 w-full"
              disabled={loading}
            />
          </div>

          <Button
            onClick={onSearch}
            className="bg-gray-800 text-white hover:bg-gray-700 rounded-md px-4 py-2"
            disabled={loading}
          >
            Rechercher
          </Button>

          {searchQuery && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClearSearch}
              className="rounded-md h-9 w-9 flex-shrink-0 bg-transparent"
              disabled={loading}
            >
              {/* You can keep your X icon here */}
              <span className="sr-only">Effacer la recherche</span>
            </Button>
          )}

          <Select
            value={String(rowsPerPage)}
            onValueChange={value => onRowsPerPageChange(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="w-[150px] rounded-md flex-shrink-0">
              <SelectValue placeholder={`${rowsPerPage} par page`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 par page</SelectItem>
              <SelectItem value="500">500 par page</SelectItem>
              <SelectItem value="1000">1000 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>{optionalSlot}</div>
      </div>
    </div>
  )
}

export default TableToolbar
