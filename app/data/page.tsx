'use client'

import { ArrowDown, ArrowUp, Download, Loader2, Trash2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ListenTableRow } from '@/app/data/components/listen-table-row'
import TableNavigation from '@/components/common/tables/table-navigation'
import TableToolbar from '@/components/common/tables/table-toolbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableHeader, TableRow, TableHead as TH } from '@/components/ui/table'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useToast } from '@/lib/utils'
import type { FListen } from '@/types'

export default function DataPage() {
  const { toast } = useToast()

  // Raw list coming from the backend (one page)
  const [rawListens, setRawListens] = useState<FListen[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(1000)
  const [showInvalidRows, setShowInvalidRows] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalListens, setTotalListens] = useState(0) // total count from server if provided, otherwise fallback to rawListens length
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedListenIds, setSelectedListenIds] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('ts')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Column header -> sort key mapping (used to render header)
  const columnSortKeys: { [key: string]: string } = {
    'Date & Heure': 'ts',
    Titre: 'title',
    Artistes: 'artist',
    Album: 'album',
    'Date de Sortie': 'releaseDate',
    'Style Musical': 'genre',
    'Sous-genre': 'subGenre',
    Origine: 'country',
    "Temps d'écoute": 'msPlayed',
    'Reason Start': 'reasonStart',
    'Reason End': 'reasonEnd',
    Skipped: 'skipped',
    'Écoute ≥ 30s': 'isValid',
    Plateforme: 'platform',
  }

  // Visible listens after client-side filtering (hide listens < 30s if showInvalidRows===false)
  const visibleListens = useMemo(() => {
    if (showInvalidRows) return rawListens
    return rawListens.filter(l => (l.ms_played ?? 0) >= 30000)
  }, [rawListens, showInvalidRows])

  // Derived values for pagination display
  const totalPages = Math.max(1, Math.ceil((totalListens || visibleListens.length) / rowsPerPage))
  const fromIndex = (currentPage - 1) * rowsPerPage + 1
  const toIndex = (currentPage - 1) * rowsPerPage + visibleListens.length

  const fetchListens = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(rowsPerPage),
        orderBy: sortColumn,
        orderDirection: sortDirection,
      })

      if (activeSearchQuery) {
        params.append('search', activeSearchQuery)
      }

      // NOTE: we do not append 'is_valid' here because backend shape may differ.
      // We keep client-side filtering for showInvalidRows.

      const response = await fetch(`/api/listens?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: FListen[] = await response.json()

      const totalCountHeader = response.headers.get('X-Total-Count')
      if (totalCountHeader) {
        setTotalListens(Number(totalCountHeader))
      } else {
        setTotalListens(data.length)
      }

      setRawListens(data)
      setSelectedListenIds(new Set())
      setSelectAll(false)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data.')
      toast({
        title: 'Erreur de chargement',
        description: e.message || "Impossible de charger les données d'écoute.",
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentPage, rowsPerPage, activeSearchQuery, sortColumn, sortDirection, toast])

  useEffect(() => {
    fetchListens()
  }, [fetchListens])

  const handleSearchClick = () => {
    setCurrentPage(1)
    setActiveSearchQuery(searchQuery)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveSearchQuery('')
    setCurrentPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearchClick()
  }

  const handleSort = useCallback(
    (columnKey: string) => {
      if (sortColumn === columnKey) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(columnKey)
        setSortDirection(columnKey === 'ts' ? 'desc' : 'asc')
      }
      setCurrentPage(1)
    },
    [sortColumn]
  )

  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Selection handlers
  const handleSelectRow = useCallback((id: number, checked: boolean) => {
    setSelectedListenIds(prev => {
      const newSet = new Set(prev)
      if (checked) newSet.add(id)
      else newSet.delete(id)
      return newSet
    })
  }, [])

  const handleSelectAllRows = useCallback(
    (checked: boolean) => {
      setSelectAll(checked)
      setSelectedListenIds(() => {
        const newSet = new Set<number>()
        if (checked) {
          rawListens.forEach(listen => {
            if (listen.id != null) newSet.add(listen.id)
          })
        }
        return newSet
      })
    },
    [rawListens]
  )

  const handleDeleteSelected = async () => {
    if (selectedListenIds.size === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/listens/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedListenIds) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || 'Erreur lors de la suppression des écoutes sélectionnées.'
        )
      }

      const result = await response.json()
      toast({ title: 'Suppression réussie', description: result.message })
      await fetchListens()
    } catch (e: any) {
      toast({
        title: 'Erreur de suppression',
        description: e.message || 'Impossible de supprimer les écoutes sélectionnées.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/clear-database', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erreur lors du vidage')
      toast({
        title: 'Base de données vidée',
        description: "Toutes les données d'écoute ont été supprimées avec succès.",
      })
      await fetchListens()
    } catch (error: any) {
      toast({
        title: 'Erreur de vidage',
        description: error.message || 'Impossible de vider la base de données.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex flex-col">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Download className="h-6 w-6 text-gray-800" />
              Historique d'Écoute Brut
            </CardTitle>
            <CardDescription className="text-gray-500 ml-[32px] mt-1">
              Explorez votre historique d'écoute complet.
            </CardDescription>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={loading}
                variant="destructive"
                className="h-9 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Supprimer tout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-bold text-red-600">⚠️ ATTENTION !</span> Cette action est
                  irréversible. Cela supprimera <span className="font-bold">TOUTES</span> les
                  données d'écoute, les artistes, albums et titres de votre base de données. Seules
                  les tables de référence seront préservées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearDatabase}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Oui, vider la base
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
      </Card>

      {/* Toolbar: we pass delete button + show-invalid toggle via rightSlot */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearchClick}
        onClearSearch={handleClearSearch}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={n => {
          setRowsPerPage(n)
          setCurrentPage(1)
        }}
        loading={loading}
        optionalSlot={
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedListenIds.size === 0 || loading}
              className="rounded-md flex-shrink-0 bg-red-600 hover:bg-red-700 text-white"
              size="icon"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Supprimer sélection</span>
            </Button>

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
          </div>
        }
      />

      {/* Top pagination */}
      <div className="mb-4">
        <TableNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          from={fromIndex}
          to={toIndex}
          totalItems={totalListens || visibleListens.length}
          loading={loading}
          onFirst={() => setCurrentPage(1)}
          onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          onLast={() => setCurrentPage(totalPages)}
        />
      </div>

      <div className="overflow-x-auto mt-4 border rounded-md">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement des données...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">Erreur: {error}</div>
        ) : visibleListens.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Aucune donnée disponible. Veuillez uploader des fichiers ou ajuster votre recherche.
          </div>
        ) : (
          <TooltipProvider>
            <Table className="table-fixed">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TH className="w-[40px] text-xs">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAllRows}
                      disabled={loading || rawListens.length === 0}
                    />
                  </TH>

                  {Object.entries(columnSortKeys).map(([headerText, sortKey]) => (
                    <TH
                      key={sortKey}
                      className={`text-xs cursor-pointer hover:bg-gray-200 transition-colors ${
                        sortKey === 'ts'
                          ? 'w-[160px]'
                          : sortKey === 'title'
                          ? 'w-[170px]'
                          : sortKey === 'artist'
                          ? 'w-[170px]'
                          : sortKey === 'album'
                          ? 'w-[130px]'
                          : sortKey === 'releaseDate'
                          ? 'w-[80px]'
                          : sortKey === 'genre'
                          ? 'w-[100px]'
                          : sortKey === 'subGenre'
                          ? 'w-[80px]'
                          : sortKey === 'country'
                          ? 'w-[80px]'
                          : sortKey === 'msPlayed'
                          ? 'w-[80px]'
                          : sortKey === 'reasonStart'
                          ? 'w-[90px]'
                          : sortKey === 'reasonEnd'
                          ? 'w-[90px]'
                          : sortKey === 'skipped'
                          ? 'w-[60px]'
                          : sortKey === 'isValid'
                          ? 'w-[60px]'
                          : sortKey === 'platform'
                          ? 'w-[80px]'
                          : ''
                      }`}
                      onClick={() => handleSort(sortKey)}
                    >
                      <div className="flex items-center gap-1">
                        {headerText}
                        {sortColumn === sortKey &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </div>
                    </TH>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleListens.map(listen => (
                  <ListenTableRow
                    key={listen.id ?? listen.ts}
                    listen={listen}
                    isSelected={listen.id != null ? selectedListenIds.has(listen.id) : false}
                    onSelect={handleSelectRow}
                    formatDuration={formatDuration}
                    showInvalidRows={showInvalidRows}
                    loading={loading}
                  />
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>

      <div className="mt-4">
        <TableNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          from={fromIndex}
          to={toIndex}
          totalItems={totalListens || visibleListens.length}
          loading={loading}
          onFirst={() => setCurrentPage(1)}
          onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          onLast={() => setCurrentPage(totalPages)}
        />
      </div>
    </div>
  )
}
