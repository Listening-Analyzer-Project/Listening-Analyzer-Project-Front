'use client'

import { MoreHorizontal } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GroupViewItem } from '@/lib/store'
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

          {/* Collapse button: stopPropagation so it doesn't bubble to parent/drag */}
          <button
            onClick={e => {
              e.stopPropagation()
              onToggleCollapse(id)
            }}
            className="text-sm font-medium flex items-center gap-2"
            aria-label={collapsed ? 'Expand group' : 'Collapse group'}
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
          {/* Dropdown menu: prevent clicks from bubbling up */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Group actions"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
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

          {/* Drag handle: Sortable wrapper will spread attributes/listeners here */}
          <button
            // attributes & listeners will be spread here by the Sortable wrapper (in users-menu.tsx)
            // keep a stopPropagation on click to avoid bubbling
            onClick={e => e.stopPropagation()}
            aria-label="Drag group"
            className="p-1 ml-1 rounded hover:bg-gray-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M10 6h4M10 12h4M10 18h4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </li>
  )
}
