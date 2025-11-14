'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { userService } from '@/lib/api'
import type { ViewItem } from '@/lib/store'
import type { FUser } from '@/types'
import { MoreHorizontal } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function UserItem({
  id,
  item,
  usersById,
  selected,
  onToggleSelect,
  onEditUserClick,
  onDelete,
  onAfterUserRename,
  color,
}: {
  id: string
  item: ViewItem
  usersById: Map<number, FUser>
  selected: boolean
  onToggleSelect: (id: string) => void
  onEditUserClick: (u: FUser) => void
  onDelete: (id: string, type: 'user' | 'alias') => void
  onAfterUserRename?: () => Promise<void>
  color?: string
}) {
  const isUser = item.type === 'user'
  const isAlias = item.type === 'alias'
  if (!isUser && !isAlias) return null

  const user = usersById.get(item.userId)
  const baseName = user?.name ?? 'User'
  const label = isAlias ? `${baseName} ALIAS` : baseName

  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(label)

  useEffect(() => {
    setValue(label)
  }, [label])

  const commitRename = async () => {
    const trimmed = (value ?? '').trim()
    if (!trimmed) {
      setRenaming(false)
      setValue(label)
      return
    }
    if (trimmed === label) {
      setRenaming(false)
      return
    }

    if (isUser) {
      try {
        await userService.update(item.userId, { name: trimmed })
        if (onAfterUserRename) await onAfterUserRename()
      } catch (err) {
        console.error('rename user error', err)
      } finally {
        setRenaming(false)
      }
    } else {
      setRenaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenaming(false)
      setValue(label)
    }
  }

  const initials = baseName
    .split(' ')
    .map(s => (s ? s[0] : ''))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const avatarBg = color || `hsl(${(item.userId * 37) % 360} 60% 40%)`

  // Fonction pour empêcher la propagation des événements
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded p-2 hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {
            onToggleSelect(id)
          }}
          onClick={e => {
            e.stopPropagation()
          }}
          className="h-4 w-4"
        />
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0"
          style={{ background: avatarBg }}
        >
          {initials}
        </div>
        <div className="flex-1">
          {renaming ? (
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitRename}
              className="w-full rounded border px-2 py-1 text-sm"
              aria-label="Rename"
              autoFocus
            />
          ) : (
            <div
              className="cursor-pointer"
              onClick={() => {
                if (user) onEditUserClick(user)
              }}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                type: {user?.type ?? '-'} {user?.isadmin ? ' · admin' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Item actions"
            onClick={stopPropagation}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" onClick={stopPropagation}>
          {isUser && (
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault()
                setRenaming(true)
              }}
            >
              Rename
            </DropdownMenuItem>
          )}
          {isUser && user && (
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault()
                onEditUserClick(user)
              }}
            >
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault()
              onDelete(id, isUser ? 'user' : 'alias')
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
