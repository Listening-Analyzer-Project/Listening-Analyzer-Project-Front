import React, { useCallback, useMemo } from 'react'

import { TableCellTruncated } from '@/components/common/tables/table-cell-truncated' // you said keep it as-is
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import type { FListen } from '@/types/bdd-types-front'

interface ListenTableRowProps {
  listen: FListen
  isSelected: boolean
  onSelect: (id: number, checked: boolean) => void
  formatDuration: (ms: number) => string
  showInvalidRows: boolean
  loading: boolean
}

const VALID_MS_THRESHOLD = 30000 // keep threshold here, simple and explicit

export const ListenTableRow = React.memo(function ListenTableRow({
  listen,
  isSelected,
  onSelect,
  formatDuration,
  showInvalidRows,
  loading,
}: ListenTableRowProps) {
  const {
    title,
    artists,
    albumTitle,
    releaseDate,
    genre,
    primaryArtistCountry,
    isValid,
    reasonEnd,
  } = useMemo(() => {
    const track = listen.track

    const title = track?.title ?? 'N/A'
    const artists =
      track?.artists
        ?.map(a => a.name)
        .filter(Boolean)
        .join(', ') ?? 'N/A'
    const albumTitle = track?.album?.title ?? 'N/A'
    // album release: day precision
    const releaseDate = track?.album?.release_date
      ? formatDate(track.album.release_date, 'day')
      : 'N/A'

    const genre = track?.sub_genre?.genre?.name ?? track?.sub_genre?.name ?? 'N/A'

    const primaryArtistCountry = track?.artists?.[0]?.country?.name ?? 'N/A'

    // local inline validity check (no helper)
    const isValid = (listen.ms_played ?? 0) >= VALID_MS_THRESHOLD

    const reasonEnd = listen.reason_end ?? ''

    return {
      title,
      artists,
      albumTitle,
      releaseDate,
      genre,
      primaryArtistCountry,
      isValid,
      reasonEnd,
    }
  }, [listen])

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      if (listen.id == null) return
      onSelect(listen.id, checked)
    },
    [listen.id, onSelect]
  )

  const rowKey = listen.id != null ? String(listen.id) : `ts-${listen.ts}`

  return (
    <TableRow key={rowKey} className={!isValid && showInvalidRows ? 'bg-red-100' : ''}>
      <TableCell className="w-[40px] py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          disabled={loading}
          aria-label={`Select listen ${listen.id ?? listen.ts}`}
        />
      </TableCell>

      {/* listen timestamp: show seconds precision */}
      <TableCellTruncated text={formatDate(listen.ts, 'second')} width="w-[160px]" />
      <TableCellTruncated text={title} width="w-[170px]" />
      <TableCellTruncated text={artists} width="w-[170px]" />
      <TableCellTruncated text={albumTitle} width="w-[130px]" />
      <TableCellTruncated text={releaseDate} width="w-[80px]" />
      <TableCellTruncated text={genre} width="w-[100px]" />
      <TableCellTruncated text={primaryArtistCountry} width="w-[80px]" />

      <TableCell className="w-[60px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
        {formatDuration(listen.ms_played ?? 0)}
      </TableCell>

      <TableCellTruncated text={reasonEnd} width="w-[90px]" />

      <TableCell className="w-[60px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
        {isValid ? 'Oui' : 'Non'}
      </TableCell>

      <TableCellTruncated text={listen.platform ?? ''} width="w-[80px]" />
    </TableRow>
  )
})

ListenTableRow.displayName = 'ListenTableRow'
export default ListenTableRow
