import React from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { TruncatedTextWithTooltip } from "@/components/truncated-text-with-tooltip"
import type { Listen } from "@/app/data/page" // Import the Listen type

interface ListenTableRowProps {
  listen: Listen
  isSelected: boolean
  onSelect: (id: number, checked: boolean) => void
  formatDuration: (ms: number) => string
  showInvalidRows: boolean
  loading: boolean
}

export const ListenTableRow = React.memo(
  ({ listen, isSelected, onSelect, formatDuration, showInvalidRows, loading }: ListenTableRowProps) => {
    return (
      <TableRow key={listen.id} className={!listen.is_valid && showInvalidRows ? "bg-red-100" : ""}>
        <TableCell className="w-[40px] py-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked: boolean) => onSelect(listen.id, checked)}
            disabled={loading}
          />
        </TableCell>
        <TableCell className="w-[160px] py-1">
          <TruncatedTextWithTooltip text={new Date(listen.ts).toLocaleString()} className="text-xs" />
        </TableCell>
        <TableCell className="w-[170px] py-1">
          <TruncatedTextWithTooltip text={listen.tracks?.title} className="text-xs" />
        </TableCell>
        <TableCell className="w-[170px] py-1">
          <TruncatedTextWithTooltip
            text={listen.tracks?.track_artists
              ?.map((artist) => artist.name)
              .filter(Boolean)
              .join(", ")}
            className="text-xs"
          />
        </TableCell>
        <TableCell className="w-[130px] py-1">
          <TruncatedTextWithTooltip text={listen.tracks?.albums?.title} className="text-xs" />
        </TableCell>
        <TableCell className="w-[80px] py-1">
          <TruncatedTextWithTooltip
            text={
              listen.tracks?.albums?.release_date
                ? new Date(listen.tracks.albums.release_date).toLocaleDateString()
                : "N/A"
            }
            className="text-xs"
          />
        </TableCell>
        <TableCell className="w-[100px] py-1">
          <TruncatedTextWithTooltip text={listen.tracks?.genres?.name} className="text-xs" />
        </TableCell>
        <TableCell className="w-[100px] py-1">
          <TruncatedTextWithTooltip text={listen.tracks?.sub_genres?.name} className="text-xs" />
        </TableCell>
        <TableCell className="w-[80px] py-1">
          <TruncatedTextWithTooltip text={listen.tracks?.ambiances?.name} className="text-xs" />
        </TableCell>
        <TableCell className="w-[80px] py-1">
          <TruncatedTextWithTooltip text={listen.primary_artist_country} className="text-xs" />
        </TableCell>
        <TableCell className="w-[60px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {formatDuration(listen.ms_played)}
        </TableCell>
        <TableCell className="w-[90px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {listen.reason_start}
        </TableCell>
        <TableCell className="w-[90px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {listen.reason_end}
        </TableCell>
        <TableCell className="w-[60px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {listen.skipped ? "Oui" : "Non"}
        </TableCell>
        <TableCell className="w-[60px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {listen.is_valid ? "Oui" : "Non"}
        </TableCell>
        <TableCell className="w-[80px] whitespace-nowrap overflow-hidden text-ellipsis text-xs py-1">
          {listen.platform}
        </TableCell>
      </TableRow>
    )
  },
)

ListenTableRow.displayName = "ListenTableRow"
