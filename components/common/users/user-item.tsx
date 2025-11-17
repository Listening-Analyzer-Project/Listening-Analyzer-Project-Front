'use client'

import { MoreHorizontal } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { userService } from '@/lib/api'
import type { ViewItem } from '@/lib/store'
import type { FUser } from '@/types'
import InlineRenameInput from './inline-rename-input'

export default function UserItem({
  id,
  item,
  usersById,
  selected,
  onToggleSelect,
  onEditUserClick,
  onDelete,
  onAfterUserRename,
  onCreateAlias,
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
  onCreateAlias?: (userId: number) => void
  color?: string
}) {
  const isUser = item.type === 'user'
  const isAlias = item.type === 'alias'
  if (!isUser && !isAlias) return null

  const user = usersById.get(item.userId)
  const baseName = user?.name ?? 'User'
  const label = isAlias ? `${baseName} ALIAS` : baseName

  // rename state
  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(label)

  // controlled dropdown open state + pending rename flag
  const [menuOpen, setMenuOpen] = useState(false)
  const pendingRenameRef = useRef(false)

  // input ref for rename (not strictly needed since InlineRenameInput manages focus)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setValue(label)
  }, [label])

  // When dropdown closes and a rename was requested, start renaming
  useEffect(() => {
    if (!menuOpen && pendingRenameRef.current) {
      pendingRenameRef.current = false
      const timer = setTimeout(() => {
        setRenaming(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [menuOpen])

  // commit logic extracted to accept a provided value
  const commitRenameWithValue = async (newName: string) => {
    const trimmed = (newName ?? '').trim()
    if (!trimmed) {
      // nothing - caller should close renaming
      return
    }
    if (trimmed === label) {
      // no change
      return
    }

    if (isUser) {
      try {
        let existingUser = usersById.get(item.userId)

        if (!existingUser) {
          try {
            existingUser = await userService.fetchById(item.userId)
          } catch (fetchErr) {
            console.warn('Could not fetch full user, proceeding with minimal payload', fetchErr)
          }
        }

        let payload: Partial<FUser> = {}
        if (existingUser) {
          payload = { ...existingUser, name: trimmed }
          if (typeof existingUser.isadmin === 'boolean')
            payload.isadmin = existingUser.isadmin ? 1 : 0
        } else {
          payload = { name: trimmed }
        }

        await userService.update(item.userId, payload)

        if (onAfterUserRename) await onAfterUserRename()
      } catch (err: any) {
        console.error('rename user error', err)
        const msg = err?.message ?? 'Erreur lors du renommage'
        // replace by your toast if available
        alert(`Impossible de renommer l'utilisateur : ${msg}`)
        // rethrow? we swallow because we want UI to keep working
      }
    } else {
      // alias case: nothing to update server-side here by default
    }
  }

  // StopPropagation for the trigger button only
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const initials = baseName
    .split(' ')
    .map(s => (s ? s[0] : ''))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const avatarBg = color || `hsl(${(item.userId * 37) % 360} 60% 40%)`

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
            <InlineRenameInput
              initialValue={value}
              onSave={async v => {
                setValue(v)
                try {
                  await commitRenameWithValue(v)
                } finally {
                  setRenaming(false)
                }
              }}
              onCancel={() => {
                setRenaming(false)
                setValue(label)
              }}
              className=""
              placeholder="Rename"
            />
          ) : (
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                type: {user?.type ?? '-'} {user?.isadmin ? ' · admin' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <DropdownMenu open={menuOpen} onOpenChange={(o: boolean) => setMenuOpen(o)}>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Item actions"
            onClick={stopPropagation}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {isUser && (
            <DropdownMenuItem
              onSelect={() => {
                // mark intention and close menu; effect on menuOpen -> triggers renaming when closed
                pendingRenameRef.current = true
                setMenuOpen(false)
              }}
            >
              Rename
            </DropdownMenuItem>
          )}
          {isUser && user && (
            <DropdownMenuItem
              onSelect={() => {
                // close menu then open edit dialog
                setMenuOpen(false)
                onEditUserClick(user)
              }}
            >
              Edit
            </DropdownMenuItem>
          )}
          {isUser && (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                onCreateAlias?.(item.userId)
              }}
            >
              Create alias
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              setMenuOpen(false)
              if (isAlias) {
                onDelete(id, 'alias')
              } else {
                onDelete(id, isUser ? 'user' : 'alias')
              }
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
