'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GroupViewItem } from '@/lib/store'
import { MoreHorizontal } from 'lucide-react'
import InlineRenameInput from './inline-rename-input'

export default function UsersGroupItem({
  id,
  group,
  collapsed,
  onToggleCollapse,
  selected,
  onToggleSelect,
  isEditingLabel,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onDeleteGroup,
  color,
  colorMap,
}: {
  id: string
  group: GroupViewItem
  collapsed: boolean
  onToggleCollapse: (id: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
  isEditingLabel: boolean
  onRenameStart: (id: string) => void
  onRenameSave: (id: string, newName: string) => void | Promise<void>
  onRenameCancel: () => void
  onDeleteGroup: (id: string) => void
  color?: string
  colorMap?: Map<string, string>
}) {
  return (
    <li className="rounded p-1">
      <div
        className="flex items-center justify-between gap-3 p-2 hover:bg-gray-50 rounded"
        style={{ background: color }}
      >
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(id)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4"
          />
          <button
            onClick={() => onToggleCollapse(id)}
            className="text-sm font-medium flex items-center gap-2"
          >
            <span className="w-6 text-xs">{collapsed ? '▸' : '▾'}</span>
            {isEditingLabel ? (
              <InlineRenameInput
                initialValue={group.name ?? 'Group'}
                onSave={async v => {
                  await onRenameSave(id, v)
                }}
                onCancel={() => onRenameCancel()}
              />
            ) : (
              <span>{group.name ?? 'Group'}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-gray-100" aria-label="Group actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={e => {
                  e.preventDefault()
                  onRenameStart(id)
                }}
              >
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={e => {
                  e.preventDefault()
                  onDeleteGroup(id)
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
