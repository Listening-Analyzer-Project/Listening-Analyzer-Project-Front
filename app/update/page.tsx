"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, X, RefreshCcw, ArrowUp, ArrowDown, User2, Loader2, Save } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ArtistTableRow } from "@/components/artist-table-row"

interface ArtistAnalytics {
  artist_id: number
  artist_name: string
  country_name: string | null
  country_id: number | null
  spotify_genres: string | null
  valid_listens: number
  invalid_listens: number
  rank: number
}

interface Country {
  id: number
  name: string
  usage_count: number
}

export default function UpdatePage() {
  const { toast } = useToast()
  const [artists, setArtists] = useState<ArtistAnalytics[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearchQuery, setActiveSearchQuery] = useState("")
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalArtists, setTotalArtists] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string>("valid_listens")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [modifiedArtists, setModifiedArtists] = useState<Map<number, number | null>>(new Map())

  const [countries, setCountries] = useState<Country[]>([])

  const totalPages = Math.ceil(totalArtists / rowsPerPage)

  // Refs pour les états qui changent fréquemment
  const currentPageRef = useRef(currentPage)
  const rowsPerPageRef = useRef(rowsPerPage)
  const activeSearchQueryRef = useRef(activeSearchQuery)
  const sortColumnRef = useRef(sortColumn)
  const sortDirectionRef = useRef(sortDirection)

  // Mettre à jour les refs lorsque les états changent
  useEffect(() => {
    currentPageRef.current = currentPage
    rowsPerPageRef.current = rowsPerPage
    activeSearchQueryRef.current = activeSearchQuery
    sortColumnRef.current = sortColumn
    sortDirectionRef.current = sortDirection
  }, [currentPage, rowsPerPage, activeSearchQuery, sortColumn, sortDirection])

  const columnSortKeys: { [key: string]: string } = {
    "Écoutes ≥ 30s": "valid_listens",
    "Écoutes < 30s": "invalid_listens",
    "Nom de l'Artiste": "artist_name",
    Origine: "country_name",
    "Genres Spotify": "spotify_genres_list",
    Actions: "actions",
  }

  const fetchArtists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(currentPageRef.current),
        limit: String(rowsPerPageRef.current),
        orderBy: String(sortColumnRef.current),
        orderDirection: String(sortDirectionRef.current),
      })

      if (activeSearchQueryRef.current) {
        params.append("search", activeSearchQueryRef.current)
      }

      const response = await fetch(`/api/analytics/artists?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: ArtistAnalytics[] = await response.json()

      const totalCountHeader = response.headers.get("X-Total-Count")
      if (totalCountHeader) {
        setTotalArtists(Number(totalCountHeader))
      } else {
        setTotalArtists(data.length)
      }

      setArtists(data)
      setModifiedArtists(new Map())
    } catch (e: any) {
      setError(e.message || "Failed to fetch data.")
      toast({
        title: "Erreur de chargement",
        description: e.message || "Impossible de charger les données des artistes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/countries/ranked")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Country[] = await response.json()
      setCountries(data)
    } catch (e: any) {
      toast({
        title: "Erreur de chargement",
        description: e.message || "Impossible de charger la liste des pays.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Effect for fetching artists (depends on pagination/sort/search state)
  useEffect(() => {
    fetchArtists()
  }, [fetchArtists, currentPage, rowsPerPage, activeSearchQuery, sortColumn, sortDirection])

  // Effect for fetching countries (runs only once on mount)
  useEffect(() => {
    fetchCountries()
  }, [fetchCountries]) // This dependency array ensures it runs only once on mount

  const handleSearchClick = () => {
    setCurrentPage(1)
    setActiveSearchQuery(searchQuery)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setActiveSearchQuery("")
    setCurrentPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchClick()
    }
  }

  const handleSort = useCallback(
    (columnKey: string) => {
      if (sortColumn === columnKey) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortColumn(columnKey)
        setSortDirection(
          columnKey === "artist_name" || columnKey === "country_name" || columnKey === "spotify_genres_list"
            ? "asc"
            : "desc",
        )
      }
      setCurrentPage(1)
    },
    [sortColumn],
  )

  const handleArtistModified = useCallback((artistId: number, newCountryId: number | null, isModified: boolean) => {
    setModifiedArtists((prev) => {
      const newMap = new Map(prev)
      if (isModified) {
        newMap.set(artistId, newCountryId)
      } else {
        newMap.delete(artistId)
      }
      return newMap
    })
  }, [])

  const handleSaveCountry = useCallback(
    async (artistId: number, countryId: number | null, shouldRefetch = true) => {
      try {
        const response = await fetch(`/api/artists/${artistId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country_id: countryId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Erreur lors de la mise à jour de l'origine.")
        }

        if (shouldRefetch) {
          toast({ title: "Succès", description: "Origine de l'artiste mise à jour." })
          // Only refetch artists, countries are stable now
          await fetchArtists()
        }
        return true
      } catch (e: any) {
        if (shouldRefetch) {
          toast({
            title: "Erreur",
            description: e.message || "Impossible de mettre à jour l'origine.",
            variant: "destructive",
          })
        }
        return false
      }
    },
    [toast, fetchArtists],
  )

  const handleSaveAllModified = useCallback(async () => {
    setLoading(true)
    const updates = Array.from(modifiedArtists.entries()).map(([artistId, countryId]) =>
      handleSaveCountry(artistId, countryId, false).then((success) => ({ artistId, success })),
    )

    const results = await Promise.all(updates)
    const successfulUpdates = results.filter((r) => r.success).length
    const failedUpdates = results.length - successfulUpdates

    if (successfulUpdates > 0) {
      toast({ title: "Succès", description: `${successfulUpdates} artiste(s) mis à jour.` })
    }
    if (failedUpdates > 0) {
      toast({
        title: "Erreur",
        description: `${failedUpdates} artiste(s) n'ont pas pu être mis à jour.`,
        variant: "destructive",
      })
    }

    // Re-fetch data once after all bulk updates are done
    await fetchArtists()
    setLoading(false)
  }, [modifiedArtists, handleSaveCountry, fetchArtists, toast])

  const renderPaginationControls = () => (
    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-center">
        <span>
          Page {currentPage} sur {totalPages}
        </span>
        <span>-</span>
        <span>
          Affichage de {(currentPage - 1) * rowsPerPage + 1} à {Math.min(currentPage * rowsPerPage, totalArtists)} sur{" "}
          {totalArtists} artistes totaux
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || loading}>
          Début
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || loading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex flex-col">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <User2 className="h-6 w-6 text-gray-800" />
              Update des données par artistes
            </CardTitle>
            <CardDescription className="text-gray-500 ml-[32px] mt-1">
              Gérez vos données d'écoute Spotify. ({totalArtists} artistes)
            </CardDescription>
          </div>
          <Button variant="outline" disabled>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Sync. Albums
          </Button>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-2 mb-6 p-2 bg-white rounded-lg shadow-sm border">
        <Button asChild className="bg-gray-900 text-white hover:bg-gray-700">
          <Link href="/update">Par Artistes</Link>
        </Button>
        <Button asChild variant="ghost" className="text-gray-500 hover:text-gray-900">
          <Link href="/update/albums">Par Albums</Link>
        </Button>
        <Button asChild variant="ghost" className="text-gray-500 hover:text-gray-900">
          <Link href="/update/tracks">Par Titres</Link>
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value))
              setCurrentPage(1)
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-[150px] rounded-md flex-shrink-0">
              <SelectValue placeholder="100 / page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 / page</SelectItem>
              <SelectItem value="500">500 / page</SelectItem>
              <SelectItem value="1000">1000 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 p-2 bg-white rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Rechercher un artiste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {artists.length} / {totalArtists} artistes
        </span>
      </div>

      {renderPaginationControls()}

      <div className="overflow-x-auto mt-4 border rounded-md">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement des données...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">Erreur: {error}</div>
        ) : artists.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Aucune donnée disponible. Veuillez uploader des fichiers ou ajuster votre recherche.
          </div>
        ) : (
          <TooltipProvider>
            <Table className="table-fixed">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-[60px] text-xs">Rang</TableHead>
                  {Object.entries(columnSortKeys).map(([headerText, sortKey]) => (
                    <TableHead
                      key={sortKey}
                      className={`text-xs cursor-pointer hover:bg-gray-200 transition-colors ${
                        sortKey === "valid_listens"
                          ? "w-[100px]"
                          : sortKey === "invalid_listens"
                            ? "w-[100px]"
                            : sortKey === "artist_name"
                              ? "w-[180px]"
                              : sortKey === "country_name"
                                ? "w-[160px]"
                                : sortKey === "spotify_genres_list"
                                  ? "w-[160px]"
                                  : sortKey === "actions"
                                    ? "w-[100px]"
                                    : ""
                      }`}
                      onClick={() => handleSort(sortKey)}
                    >
                      <div className="flex items-center gap-1">
                        {headerText === "Actions" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSaveAllModified}
                            disabled={modifiedArtists.size === 0 || loading}
                            className="h-7 w-7"
                          >
                            <Save className="h-4 w-4 text-green-600" />
                            <span className="sr-only">Enregistrer tout</span>
                          </Button>
                        ) : (
                          <>
                            {headerText}
                            {sortColumn === sortKey &&
                              (sortDirection === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              ))}
                          </>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map((artist) => (
                  <ArtistTableRow
                    key={artist.artist_id}
                    artist={artist}
                    countries={countries}
                    loading={loading}
                    onSave={(artistId, countryId) => handleSaveCountry(artistId, countryId, true)}
                    onModifiedChange={handleArtistModified}
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
