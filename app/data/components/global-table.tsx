import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'
import { ArrowDown, ArrowUp, ArrowUpDown, HelpCircle } from 'lucide-react'
import { FAlbumAnalytics, FArtistAnalytics, FListenAnalytics, FTrackAnalytics } from '@/types/specific-analytics-types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/cn'

type ViewType = 'listens' | 'tracks' | 'artists' | 'albums'
type SortDirection = 'asc' | 'desc'

interface GlobalTableProps {
  data: any[]
  type: ViewType
  loading?: boolean
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (column: string) => void
}

interface ColumnDef {
  key: string
  label: string
  description?: string
  sortable?: boolean
  className?: string
}

export default function GlobalTable({ 
  data, 
  type, 
  loading, 
  sortColumn, 
  sortDirection, 
  onSort 
}: GlobalTableProps) {

  const getColumns = (): ColumnDef[] => {
    switch (type) {
      case 'listens':
        return [
          { key: 'ts', label: 'Date & Heure', description: 'Date et heure de l\'écoute', sortable: true },
          { key: 'title', label: 'Titre', description: 'Titre du morceau', sortable: true },
          { key: 'artist', label: 'Artiste', description: 'Artiste principal', sortable: true },
          { key: 'album', label: 'Album', description: 'Album du morceau', sortable: true },
          { key: 'msPlayed', label: 'Durée', description: 'Temps d\'écoute en secondes', sortable: true },
          { key: 'reasonEnd', label: 'Raison Fin', description: 'Pourquoi l\'écoute s\'est arrêtée', sortable: true },
          { key: 'isValid', label: 'Valide', description: 'Si l\'écoute est considérée comme valide (>= 30s)', sortable: true },
        ]
      case 'tracks':
        return [
          { key: 'rank_num', label: 'Rang', description: 'Classement basé sur le nombre d\'écoutes', sortable: true },
          { key: 'track_title', label: 'Titre', description: 'Titre du morceau', sortable: true },
          { key: 'album_title', label: 'Album', description: 'Album du morceau', sortable: true },
          { key: 'all_artists', label: 'Artistes', description: 'Tous les artistes participants', sortable: true },
          { key: 'genre_name', label: 'Genre', description: 'Genre musical principal', sortable: true },
          { key: 'valid_listens', label: 'Écoutes Valides', description: 'Nombre d\'écoutes supérieures à 30s', sortable: true },
          { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Nombre d\'écoutes inférieures à 30s', sortable: true },
        ]
      case 'artists':
        return [
          { key: 'rank_num', label: 'Rang', description: 'Classement de l\'artiste', sortable: true },
          { key: 'artist_name', label: 'Artiste', description: 'Nom de l\'artiste', sortable: true },
          { key: 'country_name', label: 'Pays', description: 'Pays d\'origine de l\'artiste', sortable: true },
          { key: 'genre_name', label: 'Genre', description: 'Genre principal de l\'artiste', sortable: true },
          { key: 'valid_listens', label: 'Écoutes Valides', description: 'Total des écoutes valides pour cet artiste', sortable: true },
          { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Total des écoutes invalides pour cet artiste', sortable: true },
        ]
      case 'albums':
        return [
          { key: 'rank_num', label: 'Rang', description: 'Classement de l\'album', sortable: true },
          { key: 'album_title', label: 'Album', description: 'Titre de l\'album', sortable: true },
          { key: 'release_date', label: 'Date de Sortie', description: 'Date de sortie de l\'album', sortable: true },
          { key: 'all_artists', label: 'Artistes', description: 'Artistes de l\'album', sortable: true },
          { key: 'valid_listens', label: 'Écoutes Valides', description: 'Total des écoutes valides pour cet album', sortable: true },
          { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Total des écoutes invalides pour cet album', sortable: true },
        ]
      default:
        return []
    }
  }

  const columns = getColumns()

  const renderHeader = () => (
    <TableRow className="hover:bg-transparent border-b border-border/50">
      {columns.map((col) => (
        <TableHead key={col.key} className="h-12">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer select-none group",
                      !col.sortable && "cursor-default"
                    )}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                  >
                    {col.label}
                    {col.sortable && (
                      <span className="text-muted-foreground/50 group-hover:text-foreground/70">
                        {sortColumn === col.key ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {col.description && (
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    <p>{col.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </TableHead>
      ))}
    </TableRow>
  )

  const renderRow = (item: any, index: number) => {
    switch (type) {
      case 'listens':
        const listen = item as FListenAnalytics
        return (
          <TableRow key={listen.listen_id} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-medium text-muted-foreground">
              {format(new Date(listen.listen_timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </TableCell>
            <TableCell className="font-semibold text-foreground">{listen.track_title}</TableCell>
            <TableCell>{listen.primary_artist_name}</TableCell>
            <TableCell className="text-muted-foreground">{listen.album_title}</TableCell>
            <TableCell className="text-right tabular-nums">{Math.floor(listen.ms_played / 1000)}s</TableCell>
            <TableCell>{listen.reason_end}</TableCell>
            <TableCell>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                listen.is_valid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {listen.is_valid ? 'Oui' : 'Non'}
              </span>
            </TableCell>
          </TableRow>
        )
      case 'tracks':
        const track = item as FTrackAnalytics
        return (
          <TableRow key={track.track_id} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-bold text-muted-foreground w-16 text-center">#{track.rank_num}</TableCell>
            <TableCell className="font-semibold text-foreground">{track.track_title}</TableCell>
            <TableCell className="text-muted-foreground">{track.album_title}</TableCell>
            <TableCell>{track.all_artists}</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                {track.genre_name}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium text-green-600 dark:text-green-400 tabular-nums">{track.valid_listens}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{track.invalid_listens}</TableCell>
          </TableRow>
        )
      case 'artists':
        const artist = item as FArtistAnalytics
        return (
          <TableRow key={artist.artist_id} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-bold text-muted-foreground w-16 text-center">#{artist.rank_num}</TableCell>
            <TableCell className="font-semibold text-foreground">{artist.artist_name}</TableCell>
            <TableCell>{artist.country_name}</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                {artist.genre_name}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium text-green-600 dark:text-green-400 tabular-nums">{artist.valid_listens}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{artist.invalid_listens}</TableCell>
          </TableRow>
        )
      case 'albums':
        const album = item as FAlbumAnalytics
        return (
          <TableRow key={album.album_id} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-bold text-muted-foreground w-16 text-center">#{album.rank_num}</TableCell>
            <TableCell className="font-semibold text-foreground">{album.album_title}</TableCell>
            <TableCell className="text-muted-foreground">{album.release_date ? format(new Date(album.release_date), 'dd/MM/yyyy') : '-'}</TableCell>
            <TableCell>{album.all_artists}</TableCell>
            <TableCell className="text-right font-medium text-green-600 dark:text-green-400 tabular-nums">{album.valid_listens}</TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{album.invalid_listens}</TableCell>
          </TableRow>
        )
    }
  }

  if (loading) {
    return (
      <Card className="border shadow-sm overflow-hidden">
        <div className="p-12 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p>Chargement des données...</p>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border shadow-sm overflow-hidden">
        <div className="p-12 text-center text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucune donnée disponible</p>
          <p className="text-sm mt-1">Essayez de modifier vos filtres ou d'importer des données.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border shadow-sm overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            {renderHeader()}
          </TableHeader>
          <TableBody>
            {data.map((item, index) => renderRow(item, index))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
