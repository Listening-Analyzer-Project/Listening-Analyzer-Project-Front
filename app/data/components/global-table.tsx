'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, HelpCircle } from 'lucide-react'
import React from 'react'

import { Card } from '@/components/ui/card'
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

import { cn } from '@/lib/cn'
import { COLUMN_CELL_STYLES, COLUMN_FIELD_MAPPINGS, COLUMN_RENDER_TYPES, COLUMNS_BY_VIEW } from '@/lib/constants'
import { formatDateToDisplay } from '@/lib/utils/format-date'
import { ColumnOption, RenderType, SortDirection, ViewType } from '@/types'

interface GlobalTableProps {
  data: any[]
  type: ViewType
  loading?: boolean
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (column: string) => void
  visibleColumns?: string[]
}

export default function GlobalTable({ 
  data, 
  type, 
  loading, 
  sortColumn, 
  sortDirection, 
  onSort,
  visibleColumns 
}: GlobalTableProps) {

  const getColumns = (): ColumnOption[] => {
    switch (type) {
      case 'listens':
        return COLUMNS_BY_VIEW.listens
      case 'tracks':
        return COLUMNS_BY_VIEW.tracks
      case 'artists':
        return COLUMNS_BY_VIEW.artists
      case 'albums':
        return COLUMNS_BY_VIEW.albums
      default:
        return []
    }
  }

  const allColumns = getColumns()
  const columns = visibleColumns 
    ? allColumns.filter((col) => visibleColumns.includes(col.key))
    : allColumns

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

  // Renderers: fonctions de rendu pour chaque type
  const cellRenderers: Record<RenderType, (value: any) => React.ReactNode> = {
    timestamp: (value) => formatDateToDisplay(value, 'minute', '/', true),
    
    date: (value) => formatDateToDisplay(value, 'day', '/', true),
    
    title: (value) => value,
    
    text: (value) => value,
    
    rank: (value) => `#${value}`,
    
    duration: (value) => `${Math.floor(value / 1000)}s`,
    
    badge: (value) => {
      const renderSingleBadge = (val: any, key?: any) => {
        if (!val) return null
        
        // Handle both simple strings and tag objects
        const label = typeof val === 'object' && val !== null && 'name' in val ? val.name : val

        return (
          <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
            {label}
          </span>
        )
      }

      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, idx) => renderSingleBadge(item, idx))}
          </div>
        )
      }

      return renderSingleBadge(value)
    },
    
    boolean: (value) => (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        value 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}>
        {value ? 'Oui' : 'Non'}
      </span>
    ),
    
    number: (value) => value,
    
    validListens: (value) => value,
    
    invalidListens: (value) => value
  }

  // Fonction pour obtenir l'ID unique d'une ligne selon le type
  const getRowKey = (item: any): string => {
    const keyFields: Record<ViewType, string> = {
      listens: 'listen_id',
      tracks: 'track_id',
      artists: 'artist_id',
      albums: 'album_id'
    }
    return item[keyFields[type]] || String(Math.random())
  }

  const renderRow = (item: any, index: number) => {
    return (
      <TableRow key={getRowKey(item)} className="hover:bg-muted/50 transition-colors">
        {columns.map((col) => {
          // Récupérer le nom du champ dans les données
          const fieldName = COLUMN_FIELD_MAPPINGS[type][col.key] || col.key
          const value = item[fieldName]
          
          // Récupérer le type de rendu et le renderer
          const renderType = COLUMN_RENDER_TYPES[col.key] || 'text'
          const renderer = cellRenderers[renderType]
          const cellStyle = COLUMN_CELL_STYLES[renderType]
          return (
            <TableCell key={col.key} className={cellStyle}>
              {renderer(value)}
            </TableCell>
          )
        })}
      </TableRow>
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground animate-pulse py-8">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                    <p>Chargement des données...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (!data || data.length === 0) ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                    <HelpCircle className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Aucune donnée disponible</p>
                    <p className="text-sm mt-1">Essayez de modifier vos filtres ou d'importer des données.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
