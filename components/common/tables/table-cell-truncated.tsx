import { TruncatedTextWithTooltip } from '@/components/common/truncated-text-with-tooltip'
import { TableCell } from '@/components/ui/table'

export function TableCellTruncated({
  text,
  width = '',
  className = 'text-xs',
}: {
  text: string
  width?: string
  className?: string
}) {
  return (
    <TableCell className={`${width} py-1`}>
      <TruncatedTextWithTooltip text={text} className={className} />
    </TableCell>
  )
}
