'use client'

import { Download } from 'lucide-react'
import type React from 'react'
import { useEffect, useState, useCallback } from 'react'

import TableNavigation from '@/components/common/tables/table-navigation'
import TableToolbar from '@/components/common/tables/table-toolbar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import GlobalTable from './components/global-table'

import type { ListensParams, TablesBaseParams, ViewType } from '@/types'
import { analyticsService } from '@/lib/api'
import { COLUMNS_BY_VIEW } from '@/lib/constants'
import { useColumnVisibility, useUsersViewStore } from '@/lib/store'

export default function DataPage() {
    const [viewType, setViewType] = useState<ViewType>('listens')
    const [effectiveSearchQuery, setEffectiveSearchQuery] = useState('') 
    const [rowsPerPage, setRowsPerPage] = useState(100)
    const [showInvalidRows, setShowInvalidRows] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    
    const [sortColumn, setSortColumn] = useState<string>('ts')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    const { visibleColumns, updateVisibleColumns } = useColumnVisibility()
    const { selectionState, viewState } = useUsersViewStore()
    const handleVisibleColumnsChange = (columns: string[]) => {
      updateVisibleColumns(viewType, columns)
    }

    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [totalItems, setTotalItems] = useState(0)
    const [suggestions, setSuggestions] = useState<string[]>([]) 
    const [suggestionsLoading, setSuggestionsLoading] = useState(false) 


    const handleSort = (column: string) => {
      if (sortColumn === column) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(column)
        setSortDirection('desc') // Default to desc for new column
      }
      setCurrentPage(1)
    }

    const resolveUserIds = (ids: string[]): string[] => {
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
    }

    const handleSearch = (query: string) => {
      setEffectiveSearchQuery(query) 
      setCurrentPage(1) 
    }

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
        console.error("Erreur lors de la récupération des suggestions:", err)
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, [viewType])

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true)
        setError(null)

        const resolvedUserIds = resolveUserIds(selectionState.selectedIds)

        const currentParams: any = {
          limit: rowsPerPage,
          offset: (currentPage - 1) * rowsPerPage,
          search: effectiveSearchQuery,
          order_by: sortColumn,
          order_dir: sortDirection,
          user_ids: resolvedUserIds.length > 0 ? resolvedUserIds.join(',') : ''
        }
        
        if (viewType === 'listens') {
            if (!showInvalidRows) {
              currentParams.is_valid = true
            }
        }

        try {
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

          setData(result.data)
          setTotalItems(result.total_count)

        } catch (err: any) {
          setError(err.message || 'Une erreur est survenue')
        } finally {
          setLoading(false)
        }
      }

      fetchData()
    }, [viewType, currentPage, rowsPerPage, effectiveSearchQuery, showInvalidRows, sortColumn, sortDirection, selectionState.selectedIds])

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
      <div className="container mx-auto py-8">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex flex-col">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Download className="h-6 w-6 text-gray-800" />
                Analyse des Données
              </CardTitle>
              <CardDescription className="text-gray-500 ml-[32px] mt-1">
                Explorez vos données par catégorie.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <select 
                  className="p-2 border rounded-md"
                  value={viewType}
                  onChange={(e) => {
                      const newType = e.target.value as any
                      setViewType(newType)
                      setData([])
                      setLoading(true)
                  }}
              >
                  <option value="listens">Historique d'écoutes</option>
                  <option value="tracks">Titres</option>
                  <option value="artists">Artistes</option>
                  <option value="albums">Albums</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        <TableToolbar
          onSearch={handleSearch} 
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={n => {
            setRowsPerPage(n)
            setCurrentPage(1)
          }}
          loading={loading}
          onSuggestionQueryChange={fetchSuggestions} 
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}

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
                    Afficher les écoutes {'< 30s'}
                </label>
                </div>
              )}
            </div>
          }
          availableColumns={COLUMNS_BY_VIEW[viewType]}
          visibleColumns={visibleColumns[viewType]}
          onVisibleColumnsChange={handleVisibleColumnsChange}
        />

        <div className="overflow-x-auto mt-4 mb-20 border rounded-md">
          {error ? (
            <div className="p-4 text-center text-red-500">Erreur: {error}</div>
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
        />
      </div>
    )
}