'use client'

import { Columns } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { ColumnOption } from '@/types'


interface ColumnSelectorProps {
  availableColumns: ColumnOption[]
  visibleColumns: string[]
  onVisibleColumnsChange: (columns: string[]) => void
}

export function ColumnSelector({
  availableColumns,
  visibleColumns,
  onVisibleColumnsChange,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleToggleColumn = (columnKey: string) => {
    const isCurrentlyVisible = visibleColumns.includes(columnKey)
    
    if (isCurrentlyVisible) {
      // Don't allow unchecking if it's the last visible column
      if (visibleColumns.length <= 1) {
        return
      }
      onVisibleColumnsChange(visibleColumns.filter((key) => key !== columnKey))
    } else {
      onVisibleColumnsChange([...visibleColumns, columnKey])
    }
  }

  const handleToggleAll = () => {
    if (visibleColumns.length === availableColumns.length) {
      // Keep at least one column visible
      onVisibleColumnsChange([availableColumns[0].key])
    } else {
      onVisibleColumnsChange(availableColumns.map((col) => col.key))
    }
  }

  const allSelected = visibleColumns.length === availableColumns.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns className="h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Visible Columns</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleAll}
              className="h-auto p-1 text-xs"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
          <div className="space-y-2 max-h-[225px] overflow-y-auto pr-1">
            {availableColumns.map((column) => {
              const isVisible = visibleColumns.includes(column.key)
              const isLastVisible = visibleColumns.length === 1 && isVisible
              
              return (
                <div key={column.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`column-${column.key}`}
                    checked={isVisible}
                    onCheckedChange={() => handleToggleColumn(column.key)}
                    disabled={isLastVisible}
                  />
                  <label
                    htmlFor={`column-${column.key}`}
                    className="text-sm font-medium leading-none cursor-pointer select-none"
                  >
                    {column.label}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ColumnSelector
