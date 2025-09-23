"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Search, X, RefreshCcw, ArrowUp, ArrowDown, Music, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TruncatedTextWithTooltip } from "@/components/truncated-text-with-tooltip"
import Link from "next/link"

interface TrackAnalytics {
  track_id: number
  track_title: string
  artists: string
  album_title: string
  genre_name: string | null // Ajout du nom du genre
  sub_genre_name: string | null // Ajout du nom du sous-genre
  ambiance_name: string | null // Ajout du nom de l'ambiance
  valid_listens: number
  invalid_listens: number
  rank: number // Ajout du rang
}

export default function UpdateTracksPage() {
  const [tracks, setTracks] = useState<TrackAnalytics[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearchQuery, setActiveSearchQuery] = useState("")
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTracks, setTotalTracks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string>("valid_listens")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const totalPages = Math.ceil(totalTracks / rowsPerPage)

  const columnSortKeys: { [key: string]: string } = {
    "Écoutes ≥ 30s": "valid_listens",
    "Écoutes < 30s": "invalid_listens",
    "Nom du Titre": "track_title",
    Artistes: "artists",
    Album: "album_title",
    "Style Musical": "genre_name", // Nouvelle colonne
    "Sous-genre": "sub_genre_name", // Nouvelle colonne
    Ambiance: "ambiance_name", // Nouvelle colonne
  }

  const fetchTracks = useCallback(async () => {
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
        params.append("search", activeSearchQuery)
      }

      const response = await fetch(`/api/analytics/tracks?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: TrackAnalytics[] = await response.json()

      const totalCountHeader = response.headers.get("X-Total-Count")
      if (totalCountHeader) {
        setTotalTracks(Number(totalCountHeader))
      } else {
        setTotalTracks(data.length)
      }

      setTracks(data)
    } catch (e: any) {
      setError(e.message || "Failed to fetch data.")
    } finally {
      setLoading(false)
    }
  }, [currentPage, rowsPerPage, activeSearchQuery, sortColumn, sortDirection])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

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
        // Par défaut, tri ascendant pour les colonnes de texte
        setSortDirection(
          columnKey === "track_title" ||
            columnKey === "artists" ||
            columnKey === "album_title" ||
            columnKey === "genre_name" ||
            columnKey === "sub_genre_name" ||
            columnKey === "ambiance_name"
            ? "asc"
            : "desc",
        )
      }
      setCurrentPage(1)
    },
    [sortColumn],
  )

  const renderPaginationControls = () => (
    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-center">
        <span>
          Page {currentPage} sur {totalPages}
        </span>
        <span>-</span>
        <span>
          Affichage de {(currentPage - 1) * rowsPerPage + 1} à {Math.min(currentPage * rowsPerPage, totalTracks)} sur{" "}
          {totalTracks} titres totaux
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
              <Music className="h-6 w-6 text-gray-800" />
              Update des données par titres
            </CardTitle>
            <CardDescription className="text-gray-500 ml-[32px] mt-1">
              Gérez vos données d'écoute Spotify. ({totalTracks} titres)
            </CardDescription>
          </div>
          <Button variant="outline" disabled>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Sync. Albums
          </Button>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-2 mb-6 p-2 bg-white rounded-lg shadow-sm border">
        <Button asChild variant="ghost" className="text-gray-500 hover:text-gray-900">
          <Link href="/update">Par Artistes</Link>
        </Button>
        <Button asChild variant="ghost" className="text-gray-500 hover:text-gray-900">
          <Link href="/update/albums">Par Albums</Link>
        </Button>
        <Button asChild className="bg-gray-900 text-white hover:bg-gray-700">
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
            placeholder="Rechercher un titre, artiste ou album..."
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
          {tracks.length} / {totalTracks} titres
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
        ) : tracks.length === 0 ? (
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
                            : sortKey === "track_title"
                              ? "w-[180px]" // Ajusté
                              : sortKey === "artists"
                                ? "w-[160px]" // Ajusté
                                : sortKey === "album_title"
                                  ? "w-[160px]" // Ajusté
                                  : sortKey === "genre_name"
                                    ? "w-[120px]" // Nouvelle largeur
                                    : sortKey === "sub_genre_name"
                                      ? "w-[120px]" // Nouvelle largeur
                                      : sortKey === "ambiance_name"
                                        ? "w-[100px]" // Nouvelle largeur
                                        : ""
                      }`}
                      onClick={() => handleSort(sortKey)}
                    >
                      <div className="flex items-center gap-1">
                        {headerText}
                        {sortColumn === sortKey &&
                          (sortDirection === "asc" ? (
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
                {tracks.map((track) => (
                  <TableRow key={track.track_id}>
                    <TableCell className="w-[60px] py-1">
                      <span className="text-xs font-medium text-gray-700">{track.rank}</span>
                    </TableCell>
                    <TableCell className="w-[100px] py-1">
                      <span className="text-xs font-medium text-green-600">{track.valid_listens.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="w-[100px] py-1">
                      <span className="text-xs text-red-600">{track.invalid_listens.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="w-[180px] py-1">
                      <TruncatedTextWithTooltip text={track.track_title} className="text-xs font-medium" />
                    </TableCell>
                    <TableCell className="w-[160px] py-1">
                      <TruncatedTextWithTooltip text={track.artists} className="text-xs text-gray-600" />
                    </TableCell>
                    <TableCell className="w-[160px] py-1">
                      <TruncatedTextWithTooltip text={track.album_title} className="text-xs text-gray-600" />
                    </TableCell>
                    <TableCell className="w-[120px] py-1">
                      <TruncatedTextWithTooltip text={track.genre_name || "N/A"} className="text-xs text-gray-600" />
                    </TableCell>
                    <TableCell className="w-[120px] py-1">
                      <TruncatedTextWithTooltip
                        text={track.sub_genre_name || "N/A"}
                        className="text-xs text-gray-600"
                      />
                    </TableCell>
                    <TableCell className="w-[100px] py-1">
                      <TruncatedTextWithTooltip text={track.ambiance_name || "N/A"} className="text-xs text-gray-600" />
                    </TableCell>
                  </TableRow>
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
