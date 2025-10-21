// user-menu.tsx

'use client'

import { MoreHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { getCyclicColor } from '@/services/colors'
import type { AppUser } from '@/types/types'
import ConfirmDeleteDialog from './confirm-delete-dialog'
import UserSheet from './user-dialog'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortlist' as const

export default function UserMenu({ onSelect }: { onSelect?: (u: AppUser) => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<AppUser> | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDeleteId, setToDeleteId] = useState<number | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .order('id', { ascending: true })
      if (error) throw error
      setUsers((data as AppUser[]) ?? [])
      if (!selectedId && data && data.length > 0) setSelectedId((data as AppUser[])[0].id)
    } catch (err) {
      console.error('fetchUsers error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const initials = (name: string) =>
    name
      .split(' ')
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  const handleSave = async (payload: Partial<AppUser> & { id?: number }) => {
    try {
      if (payload.id) {
        const { error } = await supabase
          .from('user')
          .update({
            name: payload.name,
            type: payload.type,
            isadmin: payload.isadmin,
            syncro_status: payload.syncro_status,
          })
          .eq('id', payload.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('user').insert([
          {
            name: payload.name,
            type: payload.type ?? 0,
            isadmin: payload.isadmin ?? false,
            syncro_status: payload.syncro_status ?? 0,
          },
        ])
        if (error) throw error
      }
      await fetchUsers()
      setSheetOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('save user error', err)
      alert('Erreur lors de la sauvegarde — voir console.')
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    try {
      const { error } = await supabase.from('user').delete().eq('id', id)
      if (error) throw error
      await fetchUsers()
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      console.error('delete user error', err)
      alert('Erreur lors de la suppression — voir console.')
    }
  }

  function getColorForIndex(index: number) {
    const cyclicIndex = index + 1 // user requested: pass index+1, not DB id
    return getCyclicColor(BASE_COLOR_HEX, EQU_DIST_COUNT, LUMINANCE_PRESET, cyclicIndex)
  }

  return (
    <>
      <div className="flex items-center">
        {(() => {
          const selectedUser = users.find(u => u.id === selectedId) ?? null
          const selectedIndex = selectedUser ? users.findIndex(u => u.id === selectedId) : -1
          const avatarBg = selectedIndex >= 0 ? getColorForIndex(selectedIndex) : '#64748b'
          const avatarInitials = selectedUser ? initials(selectedUser.name) : 'U'
          return (
            <button
              onClick={() => setDrawerOpen(true)}
              className="h-10 w-10 rounded-full inline-flex items-center justify-center font-semibold text-white shadow-sm"
              aria-label="Open users menu"
              style={{ background: avatarBg }}
            >
              {avatarInitials}
            </button>
          )
        })()}
      </div>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow transform transition-transform duration-200 flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Utilisateurs</h3>
          <button onClick={() => setDrawerOpen(false)} className="p-1 rounded hover:bg-gray-100">
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
              {users.map((u, idx) => {
                const color = getColorForIndex(idx)
                return (
                  <li
                    key={u.id}
                    className={`flex items-center justify-between gap-3 rounded p-2 cursor-pointer ${
                      selectedId === u.id ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3"
                      onClick={() => {
                        setSelectedId(u.id)
                        onSelect?.(u)
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {initials(u.name)}
                      </div>

                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          type: {u.type} {u.isadmin ? ' · admin' : ''}
                        </div>
                      </div>
                    </div>
                    <div>
                      <DropdownMenu
                        open={openMenuId === u.id}
                        onOpenChange={v => (v ? setOpenMenuId(u.id) : setOpenMenuId(null))}
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
                              setEditing(u)
                              setSheetOpen(true)
                              setOpenMenuId(null)
                            }}
                          >
                            Modifier
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              setToDeleteId(u.id)
                              setDeleteDialogOpen(true)
                              setOpenMenuId(null)
                            }}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="h-16" />
        </div>
        <div className="absolute bottom-0 left-0 w-full border-t bg-white p-4">
          <button
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
            className="w-full rounded-md bg-green-600 text-white py-2 text-sm font-medium hover:bg-green-700"
          >
            + Créer un utilisateur
          </button>
        </div>
      </div>
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={v => {
          setDeleteDialogOpen(v)
          if (!v) setOpenMenuId(null)
          if (!v) setToDeleteId(null)
        }}
        onConfirm={async () => {
          if (!toDeleteId) return
          await handleDelete(toDeleteId)
          setToDeleteId(null)
        }}
      />
      <UserSheet
        open={sheetOpen}
        onOpenChange={v => {
          setSheetOpen(v)
          if (!v) setEditing(null)
        }}
        defaultValues={editing ?? undefined}
        onSave={handleSave}
      />
    </>
  )
}
