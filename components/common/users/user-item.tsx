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
import { showErrorToast } from '@/lib/utils'
import type { FUser, ViewItem } from '@/types'
import { useRouter } from 'next/navigation'
import { TruncatedTextWithTooltip } from '../truncated-text-with-tooltip'
import InlineRenameInput from './inline-rename-input'

export default function UserItem({
  item,
  usersById,
  selected,
  onToggleSelect,
  onDelete,
  onAfterUserRename,
  onCreateAlias,
  onRenameGroup,
  onToggleCollapse,
  collapsed,
  color,
  onCloseMenu,
}: {
  item: ViewItem
  usersById: Map<number, FUser>
  selected: boolean
  onToggleSelect: (id: string) => void
  onEditUserClick?: (u: FUser) => void
  onDelete: (id: string, type: 'user' | 'alias' | 'group') => void
  onAfterUserRename?: () => Promise<void>
  onCreateAlias?: (userId: number) => void
  onRenameGroup?: (id: string, name: string) => void
  onToggleCollapse?: (id: string) => void
  collapsed?: boolean
  color?: string
  onCloseMenu?: () => void
}) {
  const id = item.id
  const router = useRouter()

  const isGroup = 'children' in item
  const isAlias = 'userId' in item && item.isAlias
  const isUser = 'userId' in item && !item.isAlias

  const user = 'userId' in item ? usersById.get(item.userId) : undefined
  
  let baseName = 'User'
  if (isGroup) {
    baseName = item.name ?? 'Group'
  } else {
    baseName = user?.name ?? 'User'
  }

  const label = isAlias ? `${baseName} ALIAS` : baseName

  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(label)

  const [menuOpen, setMenuOpen] = useState(false)
  const pendingRenameRef = useRef(false)

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
      return
    }
    if (trimmed === label) {
      return
    }

    if (isGroup) {
      onRenameGroup?.(id, trimmed)
      return
    }

    if (isUser) {
      try {
        let existingUser = usersById.get((item as any).userId)

        if (!existingUser) {
          try {
            existingUser = await userService.fetchById((item as any).userId)
          } catch (fetchErr) {
            showErrorToast(fetchErr, 'Could not fetch full user, proceeding with minimal payload')
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

        await userService.update((item as any).userId, payload)

        if (onAfterUserRename) await onAfterUserRename()
      } catch (err: any) {
        showErrorToast(err, 'Impossible to rename user')
      }
    } else {
      // alias and group case: nothing to update server-side here by default
    }
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const initials = baseName
    .split(' ')
    .map(s => (s ? s[0] : ''))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const avatarBg = color || `hsl(${(isGroup ? 0 : item.userId * 37) % 360} 60% 40%)`

  return (
    <div className="rounded p-2 hover:bg-gray-50">
      <div className="flex items-center justify-between gap-3">
        {isGroup ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(id)}
              onClick={e => e.stopPropagation()}
              className="h-4 w-4"
            />
            <button
              onClick={e => {
                e.stopPropagation()
                onToggleCollapse?.(id)
              }}
              className="text-sm font-medium flex items-center gap-3 flex-1 min-w-0"
              aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-2xl"
                  style={{ backgroundColor: color }}
                >
                  {collapsed ? '▸' : '▾'}
                </span>
              </div>
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
                  placeholder="Rename Group"
                />
              ) : (
                <TruncatedTextWithTooltip text={label} className="text-sm font-medium text-left" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
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
            <div className="flex-1 min-w-0">
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
                  <TruncatedTextWithTooltip text={label} className="text-sm font-medium" />
                  <TruncatedTextWithTooltip 
                    text={`type: ${user?.type ?? '-'}${user?.isadmin ? ' · admin' : ''}`}
                    className="text-xs text-muted-foreground"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
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

          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            {isUser && user && (
              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false)
                  onCloseMenu?.()
                  router.push(`/user/${user.id}`)
                }}
              >
                Set data
              </DropdownMenuItem>
            )}
            {(isUser || isGroup) && (
              <DropdownMenuItem
                onSelect={() => {
                  pendingRenameRef.current = true
                  setMenuOpen(false)
                }}
              >
                Rename
              </DropdownMenuItem>
            )}
            {isUser && (
              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false)
                  onCreateAlias?.((item as any).userId)
                }}
              >
                Create alias
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                if (isGroup) {
                  onDelete(id, 'group')
                } else if (isAlias) {
                  onDelete(id, 'alias')
                } else {
                  onDelete(id, 'user')
                }
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
