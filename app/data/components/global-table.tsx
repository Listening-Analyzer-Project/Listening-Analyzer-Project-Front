'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, HelpCircle } from 'lucide-react'
import React, { useEffect } from 'react'

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

import { RoundedBadge } from '@/components/common/rounded-badge'
import { TruncatedTextWithTooltip } from '@/components/common/truncated-text-with-tooltip'
import { cn } from '@/lib/cn'
import { COLUMN_BADGE_CONTEXT, COLUMN_CELL_STYLES, COLUMN_FIELD_MAPPINGS, COLUMN_RENDER_TYPES, COLUMNS_BY_VIEW } from '@/lib/constants'
import { useColorStore } from '@/lib/store/colors-store'
import { getTextColorForBackground } from '@/lib/utils'
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
  const [displayedColumns, setDisplayedColumns] = React.useState<ColumnOption[]>([])

  useEffect(() => {
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

    const newColumns = getColumns()
    setDisplayedColumns(visibleColumns ? newColumns.filter((col) => visibleColumns.includes(col.key)) : newColumns)
  }, [type, visibleColumns])

  const renderHeader = () => (
    <TableRow className="hover:bg-transparent border-b border-border/50">
      {displayedColumns.map((col) => {
        const renderType = COLUMN_RENDER_TYPES[col.key] || 'text'
        const cellStyle = COLUMN_CELL_STYLES[renderType]
        return (
        <TableHead key={col.key} className={cn("h-12", cellStyle)}>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer select-none group whitespace-nowrap",
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
        )
      })}
    </TableRow>
  )

  // 1. Get color getters from store
  const { getUserColor, getTagColor, getGenreColor, getSubGenreColor } = useColorStore()

  // Shared badge renderer logic
  const renderBadges = (value: any, item?: any, columnKey?: string) => {
      // Handle comma-separated strings by converting them to arrays
      let values = value
      if (typeof value === 'string' && value.includes(',')) {
        values = value.split(',').map(v => v.trim()).filter(v => v !== '')
      }

      const renderSingleBadge = (val: any, key?: any) => {
        if (!val) return null
        
        // Handle both simple strings and tag objects
        const label = typeof val === 'object' && val !== null && 'name' in val ? val.name : val
        const badgeContext = columnKey ? COLUMN_BADGE_CONTEXT[columnKey] : undefined
        
        let color: string | undefined
        // Determine color based on context
        if (badgeContext === 'user') {
            color = getUserColor(label)
        } else if (badgeContext === 'tag') {
            color = getTagColor(label)
        } else if (badgeContext === 'genre') {
            color = getGenreColor(label)
        } else if (badgeContext === 'sub_genre') {
            color = getSubGenreColor(item.sub_genre_id)
        }

        const textColor = color ? getTextColorForBackground(color, '#000000', '#ffffff') : '#374151'
        const backgroundColor = color || '#e5e7eb'

        return (
          <RoundedBadge
            key={key}
            value={label}
            fontSize={12}
            fontSizeRatio={0.5}
            fontWeight="500"
            mainColor={backgroundColor}
            darkTextColor={textColor}
          />
        )
      }

      if (Array.isArray(values)) {
        return (
          <div className="flex flex-wrap gap-1 w-max max-w-full">
            {values.map((item, idx) => renderSingleBadge(item, idx))}
          </div>
        )
      }

      return renderSingleBadge(values)
  }

  // Renderers: rendering functions for each type
  const cellRenderers: Record<RenderType, (value: any, item?: any, columnKey?: string) => React.ReactNode> = {
    timestamp: (value) => formatDateToDisplay(value, 'minute', '/', true),
    
    date: (value) => formatDateToDisplay(value, 'day', '/', true),
    
    title: (value) => <TruncatedTextWithTooltip text={value} />,
    
    text: (value) => <TruncatedTextWithTooltip text={value} />,
    
    album: (value) => <TruncatedTextWithTooltip text={value} className="w-[160px]" />,
    
    rank: (value) => `#${value}`,
    
    duration: (value) => {
      const totalSeconds = Math.floor(value / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    },
    
    badges: renderBadges,
    
    boolean: (value) => (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        value 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}>
        {value ? 'Yes' : 'No'}
      </span>
    ),
    
    number: (value) => {
      if (typeof value === 'boolean') return value ? 1 : 0
      return (value !== null && value !== undefined && value !== '') ? value : 0
    },
    
    validListens: (value) => (value !== null && value !== undefined && value !== '') ? value : 0,
    
    invalidListens: (value) => (value !== null && value !== undefined && value !== '') ? value : 0
  }

  // Function to get a unique record ID based on view type
  const getRowKey = (item: any): string => {
    const keyFields: Record<ViewType, string> = {
      listens: 'listen_id',
      tracks: 'track_id',
      artists: 'artist_id',
      albums: 'album_id'
    }
    return item[keyFields[type]] || String(Math.random())
  }

  const renderRow = (item: any, index: number, key: string) => {
    return (
      <TableRow key={key} className="hover:bg-muted/50 transition-colors">
        {displayedColumns.map((col) => {
          // Get the field name or function from the data mapping
          const mapping = COLUMN_FIELD_MAPPINGS[type][col.key] || col.key
          
          let value
          if (typeof mapping === 'function') {
            value = mapping(item)
          } else {
            value = item[mapping as string]
          }
          
          // Get the render type and renderer function
          const renderType = COLUMN_RENDER_TYPES[col.key] || 'text'
          const renderer = cellRenderers[renderType]
          const cellStyle = COLUMN_CELL_STYLES[renderType]
          return (
            <TableCell key={col.key} className={cellStyle}>
              {renderer(value, item, col.key)}
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
                <TableCell colSpan={displayedColumns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground animate-pulse py-8">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                    <p>Loading data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (!data || data.length === 0) ? (
              <TableRow>
                <TableCell colSpan={displayedColumns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                    <HelpCircle className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No data available</p>
                    <p className="text-sm mt-1">Try modifying your filters or importing data.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const keys = new Set<string>()
                return data.map((item, index) => {
                  let key = getRowKey(item)
                  if (keys.has(key)) {
                    key = `${key}-${index}`
                  }
                  keys.add(key)
                  return renderRow(item, index, key)
                })
              })()
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
