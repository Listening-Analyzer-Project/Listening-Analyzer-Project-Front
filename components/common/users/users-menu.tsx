'use client'

import { MoreHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { userService } from '@/lib/api'
import { useApi } from '@/lib/hooks'
import { getCyclicColor } from '@/lib/utils'
import type { FUser } from '@/types'
import ConfirmDeleteDialog from './confirm-delete-dialog'
import UserDialog from './user-dialog'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortlist' as const

export default function UsersMenu({ onSelect }: { onSelect?: (u: FUser) => void }) {
  const {
    data: usersRaw,
    loading,
    error,
    refetch,
  } = useApi<FUser[]>((signal?: AbortSignal) => userService.fetchAll({ signal }), [])

  // States
  const [users, setUsers] = useState<FUser[]>([])
  const [menuOpen, setMenuOpen] = useState(false) // contrôle le menu latéral
  const [dialogOpen, setDialogOpen] = useState(false) // contrôle le dialog de création/modification
  const [editingUser, setEditingUser] = useState<Partial<FUser> | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined)
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDeleteId, setToDeleteId] = useState<number | null>(null)

  // Sync local state with API data
  useEffect(() => {
    if (usersRaw) setUsers(usersRaw)
  }, [usersRaw])

  // Pick first user by default
  useEffect(() => {
    if ((selectedUserId === null || selectedUserId === undefined) && users.length > 0) {
      const first = users.find(u => u.id !== undefined)
      setSelectedUserId(first?.id)
    }
  }, [users, selectedUserId])

  const initials = (name = '') =>
    name
      .split(' ')
      .map(s => (s ? s[0] : ''))
      .slice(0, 2)
      .join('')
      .toUpperCase()

  const refreshUsers = async () => {
    const freshUsers = await userService.fetchAll()
    setUsers(freshUsers)
  }

  const handleSave = async (payload: Partial<FUser> & { id?: number }) => {
    try {
      if (payload.id) {
        await userService.update(payload.id, payload)
      } else {
        await userService.create(payload)
      }
      await refetch() // <- ça met à jour automatiquement le menu
      setDialogOpen(false)
      setEditingUser(null)
    } catch (err) {
      console.error('save user error', err)
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    try {
      await userService.remove(id)
      await refetch() // <- met à jour automatiquement le menu
      if (selectedUserId === id) setSelectedUserId(undefined)
    } catch (err) {
      console.error('delete user error', err)
    }
  }

  const getColorForIndex = (index: number) => {
    const cyclicIndex = index + 1
    return getCyclicColor(BASE_COLOR_HEX, EQU_DIST_COUNT, LUMINANCE_PRESET, cyclicIndex)
  }

  return (
    <>
      {/* Avatar / trigger menu */}
      <div className="flex items-center">
        {(() => {
          const selectedUser = users.find(u => u.id === selectedUserId) ?? null
          const selectedIndex = selectedUser ? users.findIndex(u => u.id === selectedUserId) : -1
          const avatarBg = selectedIndex >= 0 ? getColorForIndex(selectedIndex) : '#64748b'
          const avatarInitials = selectedUser ? initials(selectedUser.name ?? '') : 'U'
          return (
            <button
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-full inline-flex items-center justify-center font-semibold text-white shadow-sm"
              aria-label="Open users menu"
              style={{ background: avatarBg }}
            >
              {avatarInitials}
            </button>
          )
        })()}
      </div>

      {/* Menu latéral */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow transform transition-transform duration-200 flex flex-col ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Utilisateurs</h3>
          <button onClick={() => setMenuOpen(false)} className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          {loading ? (
            <div>Chargement...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
          ) : (
            <ul className="space-y-2">
              {users.map((user, idx) => {
                const color = getColorForIndex(idx)
                return (
                  <li
                    key={user.id ?? idx}
                    className={`flex items-center justify-between gap-3 rounded p-2 cursor-pointer ${
                      selectedUserId === user.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3"
                      onClick={() => {
                        setSelectedUserId(user.id)
                        onSelect?.(user)
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {initials(user.name ?? '')}
                      </div>

                      <div>
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          type: {user.type} {user.isadmin ? ' · admin' : ''}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu
                      open={openDropdownId === user.id}
                      onOpenChange={v =>
                        v ? setOpenDropdownId(user.id ?? null) : setOpenDropdownId(null)
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          className="p-1 rounded hover:bg-gray-100"
                          aria-label="User actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditingUser(user)
                            setDialogOpen(true)
                            setOpenDropdownId(null)
                          }}
                        >
                          Modifier
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setToDeleteId(user.id ?? null)
                            setDeleteDialogOpen(true)
                            setOpenDropdownId(null)
                          }}
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-full border-t bg-white p-4">
          <button
            onClick={() => {
              setEditingUser(null)
              setDialogOpen(true)
            }}
            className="w-full rounded-md bg-green-600 text-white py-2 text-sm font-medium hover:bg-green-700"
          >
            + Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Overlay pour fermer menu */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Confirmation suppression */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={v => {
          setDeleteDialogOpen(v)
          if (!v) setToDeleteId(null)
        }}
        onConfirm={async () => {
          if (!toDeleteId) return
          await handleDelete(toDeleteId)
          setToDeleteId(null)
        }}
      />

      {/* Dialog création / modification */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={v => {
          setDialogOpen(v)
          if (!v) setEditingUser(null)
        }}
        defaultValues={
          editingUser
            ? {
                ...editingUser,
                isadmin: !!editingUser.isadmin, // convert number -> boolean
              }
            : undefined
        }
        onSave={async payload => {
          const toSave: Partial<FUser> = {
            ...payload,
            isadmin: payload.isadmin ? 1 : 0,
          }
          await handleSave(toSave)
        }}
      />
    </>
  )
}
