//TODO

'use client'

import { ListenTableRow } from '@/app/data/components/listen-table-row'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useToast } from '@/lib/utils/use-toast'
import { ArrowDown, ArrowUp, Download, Loader2, Search, Trash2, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

type Album = {
  id: number
  title: string
  release_date: string
  cover_url: string | null
}

type Genre = {
  id: number
  name: string
}

type SubGenre = {
  id: number
  name: string
}

type Ambiance = {
  id: number
  name: string
}

// Define types for the data
interface GeographicalRegion {
  id: number
  name: string
}

interface Country {
  id: number
  name: string
  geographical_regions: GeographicalRegion | null
}

// Simplified Artist type for the aggregated 'all_track_artists'
interface AggregatedArtist {
  id: number
  name: string
  is_primary: boolean
}

// New type for Spotify Genre (from primary_artist_spotify_genres)
interface SpotifyGenre {
  id: number
  name: string
}

export interface Track {
  id: number
  title: string
  albums: Album
  // Now an array of simplified artists
  track_artists: AggregatedArtist[]
  genres: Genre | null
  sub_genres: SubGenre | null
  ambiances: Ambiance | null
}

export interface Listen {
  id: number
  ts: string
  platform: string
  ms_played: number
  is_valid: boolean
  conn_country: string
  ip_addr: string | null
  track_id: number
  reason_start: string
  reason_end: string
  shuffle: boolean
  skipped: boolean
  offline: boolean
  incognito_mode: boolean
  tracks: Track
  // Add primary artist details directly to Listen for easier access in table row
  primary_artist_id: number | null
  primary_artist_name: string | null
  primary_artist_country: string | null
  primary_artist_spotify_genres: SpotifyGenre[] | null // Array of spotify genres for primary artist
}

export default function DataPage() {
  const { toast } = useToast()
  const [listens, setListens] = useState<Listen[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(1000)
  const [showInvalidRows, setShowInvalidRows] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalListens, setTotalListens] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedListenIds, setSelectedListenIds] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('ts')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const totalPages = Math.ceil(totalListens / rowsPerPage)

  const columnSortKeys: { [key: string]: string } = {
    'Date & Heure': 'ts',
    Titre: 'title',
    Artistes: 'artist',
    Album: 'album',
    'Date de Sortie': 'releaseDate',
    'Style Musical': 'genre',
    'Sous-genre': 'subGenre',
    Ambiance: 'ambiance',
    Origine: 'country',
    "Temps d'écoute": 'msPlayed',
    'Reason Start': 'reasonStart',
    'Reason End': 'reasonEnd',
    Skipped: 'skipped',
    'Écoute ≥ 30s': 'isValid',
    Plateforme: 'platform',
  }

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

      if (!showInvalidRows) {
        params.append('is_valid', 'true')
      }

      const response = await fetch(`/api/listens?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Listen[] = await response.json()

      const totalCountHeader = response.headers.get('X-Total-Count')
      if (totalCountHeader) {
        setTotalListens(Number(totalCountHeader))
      } else {
        setTotalListens(data.length)
      }

      setListens(data)
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
  }, [
    currentPage,
    rowsPerPage,
    showInvalidRows,
    activeSearchQuery,
    sortColumn,
    sortDirection,
    toast,
  ])

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
    if (e.key === 'Enter') {
      handleSearchClick()
    }
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

  const renderPaginationControls = () => (
    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-center">
        <span>
          Page {currentPage} sur {totalPages}
        </span>
        <span>-</span>
        <span>
          Affichage de {(currentPage - 1) * rowsPerPage + 1} à{' '}
          {Math.min(currentPage * rowsPerPage, totalListens)} sur {totalListens} données totales
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1 || loading}
        >
          Début
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || loading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || loading}
        >
          Suivant
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages || loading}
        >
          Fin
        </Button>
      </div>
    </div>
  )

  const handleSelectRow = useCallback((id: number, checked: boolean) => {
    setSelectedListenIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  const handleSelectAllRows = useCallback(
    (checked: boolean) => {
      setSelectAll(checked)
      setSelectedListenIds(prev => {
        const newSet = new Set<number>()
        if (checked) {
          listens.forEach(listen => newSet.add(listen.id))
        }
        return newSet
      })
    },
    [listens]
  )

  const handleDeleteSelected = async () => {
    if (selectedListenIds.size === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/listens/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedListenIds) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || 'Erreur lors de la suppression des écoutes sélectionnées.'
        )
      }

      const result = await response.json()

      toast({
        title: 'Suppression réussie',
        description: result.message,
      })
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
      const response = await fetch('/api/clear-database', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du vidage')
      }

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
                  les tables de référence (pays, régions, catégories, événements) seront préservées.
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

      <div className="flex flex-col gap-4 mb-6 p-2 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher par titre, artiste..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-2 py-2 rounded-md border border-gray-300 focus:ring-0 focus:border-gray-400 w-full"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSearchClick}
            className="bg-gray-800 text-white hover:bg-gray-700 rounded-md px-4 py-2"
            disabled={loading}
          >
            Rechercher
          </Button>
          {searchQuery && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearSearch}
              className="rounded-md h-9 w-9 flex-shrink-0 bg-transparent"
              disabled={loading}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Effacer la recherche</span>
            </Button>
          )}
          <Select
            value={String(rowsPerPage)}
            onValueChange={value => {
              setRowsPerPage(Number(value))
              setCurrentPage(1)
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-[150px] rounded-md flex-shrink-0">
              <SelectValue placeholder="1000 par page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 par page</SelectItem>
              <SelectItem value="500">500 par page</SelectItem>
              <SelectItem value="1000">1000 par page</SelectItem>
            </SelectContent>
          </Select>
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
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="show-invalid-rows"
            checked={showInvalidRows}
            onCheckedChange={checked => setShowInvalidRows(checked === true)}
            disabled={loading}
          />
          <label
            htmlFor="show-invalid-rows"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Afficher les écoutes {'< 30s'}
          </label>
        </div>
      </div>

      {renderPaginationControls()}

      <div className="overflow-x-auto mt-4 border rounded-md">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement des données...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">Erreur: {error}</div>
        ) : listens.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Aucune donnée disponible. Veuillez uploader des fichiers ou ajuster votre recherche.
          </div>
        ) : (
          <TooltipProvider>
            <Table className="table-fixed">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-[40px] text-xs">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAllRows}
                      disabled={loading || listens.length === 0}
                    />
                  </TableHead>
                  {Object.entries(columnSortKeys).map(([headerText, sortKey]) => (
                    <TableHead
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
                          ? 'w-[100px]'
                          : sortKey === 'ambiance'
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
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listens.map(listen => (
                  <ListenTableRow
                    key={listen.id}
                    listen={listen}
                    isSelected={selectedListenIds.has(listen.id)}
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
      <div className="mt-4">{renderPaginationControls()}</div>
    </div>
  )
}
