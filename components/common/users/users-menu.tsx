'use client'

import { useEffect, useRef, useState } from 'react'

import { userService } from '@/lib/api'
import { useApi } from '@/lib/hooks'
import { useUsersViewStore } from '@/lib/store/users/users-provider'
import type { FUser } from '@/types'

import {
  buildRestoredPayload,
  loadPersistedPayload,
  savePersistedPayload,
} from '@/lib/store/users/users-view-persistence'
import type { GroupViewItem, ViewState } from '@/lib/store/users/users-view-store'
import { buildColorMap } from '@/lib/store/users/users-view-store'

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import AvatarStack from './avatar-stack'
import UserDeletionDialog from './user-deletion-dialog'
import UserDialog from './user-dialog'
import UserItem from './user-item'
import UsersGroupItem from './users-group-item'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortlist' as const

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : undefined,
    maxWidth: '100%',
    width: '100%',
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style} className="relative w-full">
      <div className="flex items-center w-full">
        <div className="flex-1 min-w-0">{children}</div>

        <button
          {...attributes}
          {...listeners}
          aria-label="Drag user"
          className="p-1 ml-2 rounded hover:bg-gray-100"
          onClick={e => e.stopPropagation()}
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
  )
}

function findParentId(viewState: ViewState, targetId: string): string | null {
  for (const id of viewState.order) {
    const it = viewState.items[id]
    if (!it) continue
    if (it.type === 'group') {
      const g = it as GroupViewItem
      if (g.children.includes(targetId)) return id

      const stack = [...g.children]
      while (stack.length) {
        const cid = stack.shift()!
        const child = viewState.items[cid]
        if (!child) continue
        if (child.type === 'group') {
          const cg = child as GroupViewItem
          if (cg.children.includes(targetId)) return cid
          stack.push(...cg.children)
        }
      }
    }
  }
  return null
}

export default function UsersMenu({ onSelect }: { onSelect?: (u: FUser) => void }) {
  const {
    data: usersRaw,
    loading,
    error,
    refetch,
  } = useApi<FUser[]>((signal?: AbortSignal) => userService.fetchAll({ signal }), [])

  const {
    viewState,
    selectionState,
    initFromUsers,
    reorder,
    deleteUser,
    deleteAlias,
    deleteGroup,
    renameGroup,
    toggleCollapse,
    toggleSelection,
    createGroup,
    addChildToGroup,
    restoreViewState,
    setSelection,
    createAlias,
  } = useUsersViewStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Partial<FUser> | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDeleteId, setToDeleteId] = useState<string | null>(null)
  const [toDeleteType, setToDeleteType] = useState<'user' | 'alias' | 'group' | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragScrollRef = useRef<number | null>(null)

  // Fonction pour gérer le scroll automatique pendant le drag
  const handleDragScroll = (activeId: string, y: number) => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()

    // Zone de déclenchement du scroll (50px du bord)
    const scrollThreshold = 50
    const scrollSpeed = 10

    // Scroll vers le bas
    if (y > containerRect.bottom - scrollThreshold) {
      container.scrollTop += scrollSpeed
    }
    // Scroll vers le haut
    else if (y < containerRect.top + scrollThreshold) {
      container.scrollTop -= scrollSpeed
    }
  }

  useEffect(() => {
    if (!usersRaw) return
    let mounted = true

    try {
      const loaded = loadPersistedPayload()
      const restored = buildRestoredPayload(loaded, usersRaw)

      if (!mounted) return

      restoreViewState(restored.viewState)
      setSelection(restored.selectionState.selectedIds)

      try {
        savePersistedPayload(restored)
      } catch (e) {
        console.warn('savePersistedPayload failed', e)
      }
    } catch (err) {
      console.error('error restoring persisted users view', err)
      initFromUsers(usersRaw)
    }

    return () => {
      mounted = false
    }
  }, [usersRaw, restoreViewState, setSelection, initFromUsers])

  const usersById = new Map(
    usersRaw
      ?.filter((u): u is FUser & { id: number } => u.id !== undefined && u.id !== null)
      .map(u => [u.id, u]) ?? []
  )
  const colorMap = buildColorMap(
    viewState,
    usersById,
    BASE_COLOR_HEX,
    EQU_DIST_COUNT,
    LUMINANCE_PRESET
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: any) {
    const { active } = event
    const activeId = String(active.id)

    // Démarrer le scroll automatique
    dragScrollRef.current = window.requestAnimationFrame(() => {
      const activeElement = document.querySelector(`[data-id="${activeId}"]`)
      if (activeElement) {
        const rect = activeElement.getBoundingClientRect()
        handleDragScroll(activeId, rect.top)
      }
    })
  }

  function handleDragMove(event: any) {
    const { active } = event
    const activeId = String(active.id)

    // Mettre à jour le scroll automatique
    if (dragScrollRef.current) {
      cancelAnimationFrame(dragScrollRef.current)
    }

    dragScrollRef.current = window.requestAnimationFrame(() => {
      const activeElement = document.querySelector(`[data-id="${activeId}"]`)
      if (activeElement) {
        const rect = activeElement.getBoundingClientRect()
        handleDragScroll(activeId, rect.top)
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    // Arrêter le scroll automatique
    if (dragScrollRef.current) {
      cancelAnimationFrame(dragScrollRef.current)
      dragScrollRef.current = null
    }

    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeItem = viewState.items[activeId]
    const overItem = viewState.items[overId]
    const activeParent = findParentId(viewState, activeId)
    const overParent = findParentId(viewState, overId)

    if (activeParent === overParent) {
      if (activeParent === null) {
        const oldIndex = viewState.order.indexOf(activeId)
        const newIndex = viewState.order.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = arrayMove(viewState.order, oldIndex, newIndex)
          reorder(newOrder)
        }
        return
      } else {
        const parentId = activeParent
        const parent = viewState.items[parentId] as GroupViewItem
        const overIdx = parent.children.indexOf(overId)
        const insertIndex = overIdx
        addChildToGroup(parentId, activeId, insertIndex)
      }

      return
    }

    if (
      (overItem?.type === 'user' || overItem?.type === 'alias') &&
      (activeItem?.type === 'user' || activeItem?.type === 'alias')
    ) {
      let idx = 0
      if (overParent === null) {
        idx = viewState.order.indexOf(overId)
        if (idx === -1) idx = viewState.order.length
      } else {
        idx = viewState.order.indexOf(overParent)
        if (idx === -1) idx = viewState.order.length
      }

      createGroup([overId, activeId], idx)
      return
    }

    if (overItem?.type === 'group') {
      const groupId = overId
      addChildToGroup(groupId, activeId)
      return
    }

    if (overParent) {
      const parentId = overParent
      const parent = viewState.items[parentId] as GroupViewItem
      const overIdx = parent.children.indexOf(overId)
      const insertIndex = overIdx
      addChildToGroup(parentId, activeId, insertIndex)
      return
    }

    {
      const oldIndex = viewState.order.indexOf(activeId)
      const newIndex = viewState.order.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(viewState.order, oldIndex, newIndex)
        reorder(newOrder)
      }
    }
  }

  function handleDragCancel() {
    // Arrêter le scroll automatique
    if (dragScrollRef.current) {
      cancelAnimationFrame(dragScrollRef.current)
      dragScrollRef.current = null
    }
  }

  const handleSave = async (payload: Partial<FUser> & { id?: number }) => {
    try {
      let savedUser: FUser
      if (payload.id) {
        savedUser = await userService.update(payload.id, payload)
      } else {
        savedUser = await userService.create(payload)
      }
      await refetch()
      setDialogOpen(false)
      setEditingUser(null)
      if (savedUser.id && onSelect) {
        onSelect(savedUser)
      }
    } catch (err) {
      console.error('save user error', err)
    }
  }

  const handleDelete = async (id: string, type: 'user' | 'alias' | 'group') => {
    try {
      if (type === 'user') {
        const userId = parseInt(id.split(':')[1])
        deleteUser(userId)
        await userService.remove(userId)
      } else if (type === 'alias') {
        deleteAlias(id)
      } else if (type === 'group') {
        deleteGroup(id)
      }
      await refetch()
    } catch (err) {
      console.error('delete error', err)
    }
  }

  const handleDeleteClick = (id: string, type: 'user' | 'alias' | 'group') => {
    if (type === 'alias') {
      handleDelete(id, type)
    } else {
      setToDeleteId(id)
      setToDeleteType(type)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (toDeleteId && toDeleteType) {
      await handleDelete(toDeleteId, toDeleteType)
      setDeleteDialogOpen(false)
      setToDeleteId(null)
      setToDeleteType(null)
    }
  }

  const handleRenameGroup = async (id: string, newName: string) => {
    renameGroup(id, newName)
    setRenamingGroupId(null)
  }

  const handleCreateAlias = (userId: number) => {
    try {
      const userViewId = `u:${userId}`
      const userIndex = viewState.order.indexOf(userViewId)

      if (userIndex !== -1) {
        createAlias(userId, userIndex + 1)
      } else {
        createAlias(userId)
      }
    } catch (err) {
      console.error('create alias error', err)
    }
  }

  const renderItemContent = (id: string, depth = 0) => {
    const item = viewState.items[id]
    if (!item) return null

    const isSelected = selectionState.selectedIds.includes(id)
    const isCollapsed = !!viewState.collapseMap[id]

    if (item.type === 'user' || item.type === 'alias') {
      return (
        <UserItem
          id={id}
          key={id}
          item={item}
          usersById={usersById}
          selected={isSelected}
          onToggleSelect={toggleSelection}
          onEditUserClick={user => {
            setEditingUser(user)
            setDialogOpen(true)
          }}
          onDelete={handleDeleteClick}
          onAfterUserRename={refetch}
          onCreateAlias={handleCreateAlias}
          color={colorMap.get(id) ?? colorMap.get(String(item.userId))}
        />
      )
    } else if (item.type === 'group') {
      return (
        <div key={id} className="space-y-1">
          <UsersGroupItem
            id={id}
            group={item}
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
            selected={isSelected}
            onToggleSelect={toggleSelection}
            isEditingLabel={renamingGroupId === id}
            onRenameStart={setRenamingGroupId}
            onRenameSave={handleRenameGroup}
            onRenameCancel={() => setRenamingGroupId(null)}
            onDeleteGroup={() => handleDeleteClick(id, 'group')}
            color={colorMap.get(id)}
            colorMap={colorMap}
          />
          {!isCollapsed && (
            <SortableContext
              items={(item as GroupViewItem).children}
              strategy={verticalListSortingStrategy}
            >
              <div className="ml-6 border-l-2 border-gray-200 pl-2 space-y-1">
                {(item as GroupViewItem).children.map(childId => (
                  <SortableItem id={childId} key={childId}>
                    {renderItemContent(childId, depth + 1)}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={() => setMenuOpen(true)}
          className="h-10 w-10 rounded-full inline-flex items-center justify-center bg-transparent border-none shadow-none"
          aria-label="Open users menu"
          style={{
            boxShadow: 'none',
          }}
        >
          <AvatarStack
            selectedIds={selectionState.selectedIds}
            viewState={viewState}
            usersById={usersById}
            colorMap={colorMap}
            max={3}
            size={34}
          />
        </button>
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-200 flex flex-col ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Utilisateurs</h3>
          <button onClick={() => setMenuOpen(false)} className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Conteneur principal avec hauteur fixe et scroll contrôlé */}
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{
              maxHeight: 'calc(100vh - 140px)',
              height: '100%',
            }}
          >
            <div className="px-4 pt-4 pb-4">
              {loading ? (
                <div>Chargement...</div>
              ) : viewState.order.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
              ) : (
                <DndContext
                  autoScroll={false}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  modifiers={[
                    // Restriction horizontale seulement
                    ({ transform }) => ({
                      ...transform,
                      x: 0,
                    }),
                  ]}
                >
                  <SortableContext items={viewState.order} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {viewState.order.map(id => (
                        <SortableItem id={id} key={id}>
                          {renderItemContent(id)}
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t bg-white p-4">
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

      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <UserDeletionDialog
        open={deleteDialogOpen}
        onOpenChange={v => {
          setDeleteDialogOpen(v)
          if (!v) {
            setToDeleteId(null)
            setToDeleteType(null)
          }
        }}
        onConfirm={handleConfirmDelete}
      />

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
                isadmin: !!editingUser.isadmin,
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
