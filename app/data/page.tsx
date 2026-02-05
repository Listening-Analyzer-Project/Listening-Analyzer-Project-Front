'use client'

import { Download } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import TableNavigation from '@/components/common/tables/table-navigation'
import TableToolbar from '@/components/common/tables/table-toolbar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import GlobalTable from './components/global-table'

import { analyticsService } from '@/lib/api'
import { COLUMNS_BY_VIEW } from '@/lib/constants'
import { useApi } from '@/lib/hooks'
import { useColumnVisibility } from '@/lib/store'
import { useUsersStore } from '@/lib/store/users/users-store'
import type { ListensParams, TablesBaseParams, ViewType } from '@/types'

export default function DataPage() {
  const [viewType, setViewType] = useState<ViewType>('listens')
  const [effectiveSearchQuery, setEffectiveSearchQuery] = useState('') 
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [showInvalidRows, setShowInvalidRows] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [sortColumn, setSortColumn] = useState<string>('ts')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { visibleColumns, updateVisibleColumns } = useColumnVisibility()
  const { selectionState, viewState } = useUsersStore()
  const handleVisibleColumnsChange = (columns: string[]) => {
    updateVisibleColumns(viewType, columns)
  }

  const [suggestions, setSuggestions] = useState<string[]>([]) 
  const [suggestionsLoading, setSuggestionsLoading] = useState(false) 

  const { data: apiResult, loading, error } = useApi(async () => {
    const resolvedUserIds = resolveUserIds(selectionState.selectedIds)
    const currentParams: any = {
      limit: rowsPerPage,
      offset: (currentPage - 1) * rowsPerPage,
      search: effectiveSearchQuery,
      order_by: sortColumn,
      order_dir: sortDirection,
    }

    if (resolvedUserIds.length > 0) {
      currentParams.user_ids = resolvedUserIds.join(',')
    }

    if (viewType === 'listens') {
        if (!showInvalidRows) {
          currentParams.is_valid = true
        }
    }

    let result: any
    switch (viewType) {
      case 'listens':
        result = await analyticsService.getListens(currentParams as ListensParams)
        break
      case 'tracks':
        result = await analyticsService.getTracks(currentParams as TablesBaseParams)
        break
      case 'artists':
        result = await analyticsService.getArtists(currentParams as TablesBaseParams)
        break
      case 'albums':
        result = await analyticsService.getAlbums(currentParams as TablesBaseParams)
        break
    }
    return result
  }, [viewType, currentPage, rowsPerPage, effectiveSearchQuery, showInvalidRows, sortColumn, sortDirection, selectionState.selectedIds])

  const totalItems = apiResult?.total_count || 0
  const data = apiResult?.data || []


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc') // Default to desc for new column
    }
    setCurrentPage(1)
  }

  const resolveUserIds = useCallback((ids: string[]): string[] => {
    const uniqueUserIds = new Set<string>()
    
    const visit = (id: string) => {
      const item = viewState.items[id]
      if (!item) return
      
      if ('userId' in item) {
        uniqueUserIds.add(String(item.userId))
      } else if ('children' in item) {
        item.children.forEach(visit)
      }
    }
    
    ids.forEach(visit)
    return Array.from(uniqueUserIds)
  }, [viewState.items])

  // Logic for dynamic User column visibility
  useEffect(() => {
    if (viewType !== 'listens') return

    const selectedUserIds = resolveUserIds(selectionState.selectedIds)
    const allUserIds = new Set<number>()
    Object.values(viewState.items).forEach(item => {
      if ('userId' in item) {
        allUserIds.add(item.userId)
      }
    })

    const shouldShowUserColumn = selectedUserIds.length > 1 || (selectedUserIds.length === 0 && allUserIds.size > 1)
    
    const currentVisible = visibleColumns[viewType] || []
    const isCurrentlyVisible = currentVisible.includes('user_name')

    if (shouldShowUserColumn && !isCurrentlyVisible) {
      // Add user_name at the beginning
      updateVisibleColumns(viewType, ['user_name', ...currentVisible])
    } else if (!shouldShowUserColumn && isCurrentlyVisible) {
      // Remove user_name
      updateVisibleColumns(viewType, currentVisible.filter(col => col !== 'user_name'))
    }
  }, [viewType, selectionState.selectedIds, viewState.items, visibleColumns, updateVisibleColumns, resolveUserIds])

  // Logic for dynamic Is Valid column visibility
  useEffect(() => {
    if (viewType !== 'listens') return

    const currentVisible = visibleColumns[viewType] || []
    const isCurrentlyVisible = currentVisible.includes('is_valid')

    if (showInvalidRows && !isCurrentlyVisible) {
      updateVisibleColumns(viewType, [...currentVisible, 'is_valid'])
    } else if (!showInvalidRows && isCurrentlyVisible) {
      updateVisibleColumns(viewType, currentVisible.filter(col => col !== 'is_valid'))
    }
  }, [viewType, showInvalidRows, visibleColumns, updateVisibleColumns])

  const handleSearch = useCallback((query: string) => {
    setEffectiveSearchQuery(query) 
    setCurrentPage(1) 
  }, [])

  const handleRowsPerPageChange = useCallback((n: number) => {
    setRowsPerPage(n)
    setCurrentPage(1)
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    setSuggestionsLoading(true)
    try {
      const result = await analyticsService.getSearchSuggestions({ search: query, view_type: viewType })
      setSuggestions(result.suggestions)
    } catch (err) {
      console.error("Error while fetching suggestions:", err)
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [viewType])

  useEffect(() => {
    setCurrentPage(1)
    setEffectiveSearchQuery('')
    // Reset sort when view type changes
    setSortColumn(viewType === 'listens' ? 'ts' : 'rank_num')
    setSortDirection('desc')
  }, [viewType])

  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))
  const fromIndex = (currentPage - 1) * rowsPerPage + 1
  const toIndex = Math.min((currentPage - 1) * rowsPerPage + rowsPerPage, totalItems)

  return (
    <div className="container mx-auto">
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-1 flex-shrink-0">
              <CardTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                <Download className="h-6 w-6 text-gray-800" />
                Data Analysis
              </CardTitle>
              <CardDescription className="text-gray-500 ml-8">
                Explore your data by category.
              </CardDescription>
            </div>

            <div className="flex-1 flex justify-end">
              <div className="flex p-1 bg-gray-100/80 rounded-sm border border-gray-200/50 w-fit">
                {[
                  { id: 'listens', label: 'Listening History' },
                  { id: 'tracks', label: 'Tracks' },
                  { id: 'artists', label: 'Artists' },
                  { id: 'albums', label: 'Albums' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewType(tab.id as ViewType)}
                    className={`
                      px-6 py-2 text-sm font-medium transition-all duration-200
                      ${viewType === tab.id 
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50 rounded-sm' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-sm mx-0.5'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <TableToolbar
        onSearch={handleSearch} 
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        loading={loading}
        onSuggestionQueryChange={fetchSuggestions} 
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        resetKey={viewType}

        optionalSlot={
          <div className="flex items-center gap-2">
            {viewType === 'listens' && (
              <div className="flex items-center gap-2">
              <Checkbox
                  id="show-invalid-rows"
                  checked={showInvalidRows}
                  onCheckedChange={checked => setShowInvalidRows(checked === true)}
                  disabled={loading}
              />
              <label htmlFor="show-invalid-rows" className="text-sm font-medium leading-none">
                  Show listens {'< 30s'}
              </label>
              </div>
            )}
          </div>
        }
        availableColumns={COLUMNS_BY_VIEW[viewType]?.filter(col => col.key !== 'user_name' && col.key !== 'is_valid')}
        visibleColumns={visibleColumns[viewType]}
        onVisibleColumnsChange={handleVisibleColumnsChange}
      />

      <div className="overflow-x-auto mt-6 mb-12 border rounded-md">
        {error ? (
          <div className="p-4 text-center text-red-500">Error: {String(error)}</div>
        ) : (
          <GlobalTable 
            data={data} 
            type={viewType} 
            loading={loading} 
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            visibleColumns={visibleColumns[viewType]}
          />
        )}
      </div>

      <TableNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        from={fromIndex}
        to={toIndex}
        totalItems={totalItems}
        loading={loading}
        onFirst={() => setCurrentPage(1)}
        onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        onLast={() => setCurrentPage(totalPages)}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}