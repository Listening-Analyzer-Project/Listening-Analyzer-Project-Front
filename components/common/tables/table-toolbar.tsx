'use client'

import React, { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ColumnSelector from './column-selector'
import { ColumnOption } from '@/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover' 

interface TableToolbarProps {
  effectiveSearchQuery: string
  onSearch: (query: string) => void 
  onClearSearch: () => void 
  
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
}

export function TableToolbar({
  effectiveSearchQuery,
  onSearch,
  onClearSearch,
  rowsPerPage,
  onRowsPerPageChange,
  loading = false,
  optionalSlot: optionalSlot = null,
  availableColumns,
  visibleColumns,
  onVisibleColumnsChange,
  onSuggestionQueryChange,
  suggestions,
  suggestionsLoading
}: TableToolbarProps) {
  const showColumnSelector = availableColumns && visibleColumns && onVisibleColumnsChange
  const [localSearchQuery, setLocalSearchQuery] = useState(effectiveSearchQuery)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false) 

  useEffect(() => {
    setLocalSearchQuery(effectiveSearchQuery)
  }, [effectiveSearchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== effectiveSearchQuery && localSearchQuery.length > 0) {
        onSuggestionQueryChange(localSearchQuery)
        setIsPopoverOpen(true) 
      } else {
        setIsPopoverOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchQuery, effectiveSearchQuery, onSuggestionQueryChange])

  const handleSearchClick = () => {
    onSearch(localSearchQuery) 
    setIsPopoverOpen(false) 
  }

  const handleClear = () => {
    setLocalSearchQuery('') 
    onClearSearch() 
  }

  const handleSelectSuggestion = (suggestion: string) => {
    setLocalSearchQuery(truncateSuggestion(suggestion))
    onSearch(truncateSuggestion(suggestion))
    setIsPopoverOpen(false) 
  }

/**
* Supprime le préfixe entre crochets d'une chaîne de suggestion.
*/
const truncateSuggestion = (suggestion: string): string => {
  const closingBracketIndex = suggestion.indexOf(']');

  if (suggestion.startsWith('[') && closingBracketIndex !== -1) {
    const startIndex = closingBracketIndex + 2; 

    if (startIndex < suggestion.length) {
      return suggestion.substring(startIndex);
    }
  }
  return suggestion; 
};

  return (
    <div className="flex flex-col gap-4 mb-6 p-2 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Popover open={isPopoverOpen && suggestions.length > 0}> 
            <PopoverTrigger asChild>
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Rechercher par titre, artiste..."
                  value={localSearchQuery}
                  onChange={e => setLocalSearchQuery(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSearchClick()
                  }}
                  className="pl-3 pr-2 py-2 rounded-md border border-gray-300 focus:ring-0 focus:border-gray-400 w-full"
                  disabled={loading}
                />
                {suggestionsLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xs">...</span> 
                  </div>
                )}
              </div>
            </PopoverTrigger>
            
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50">
                <div className="max-h-60 overflow-y-auto">
                    {Array.isArray(suggestions) && suggestions.map((suggestion, index) => (
                        <div 
                            key={index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            <Search className="h-4 w-4 text-gray-500" />
                            <span className="truncate">{suggestion}</span>
                        </div>
                    ))}
                </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleSearchClick}
            className="bg-gray-800 text-white hover:bg-gray-700 rounded-md px-4 py-2 flex-shrink-0"
            disabled={loading}
          >
            Rechercher
          </Button>

          {localSearchQuery && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              className="rounded-md h-9 w-9 flex-shrink-0 bg-transparent"
              disabled={loading}
            >
              <X className="h-4 w-4" />
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