'use client'

import { useEffect, useState } from 'react'

import { userService } from '@/lib/api'
import { useApi } from '@/lib/hooks'
import { buildColorMap } from '@/lib/store'
import { useUsersViewStore } from '@/lib/store/users/users-provider'
import type { FUser } from '@/types'

// types
import type { GroupViewItem, ViewState } from '@/lib/store'
import { buildRestoredPayload, loadPersistedPayload, savePersistedPayload } from '@/lib/store'

// dnd-kit
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

// Simple Sortable wrapper with a drag handle
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center">
        <div className="flex-1">{children}</div>

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

// Helpers typed with ViewState / GroupViewItem
function findParentId(viewState: ViewState, targetId: string): string | null {
  // search top-level groups first
  for (const id of viewState.order) {
    const it = viewState.items[id]
    if (!it) continue
    if (it.type === 'group') {
      const g = it as GroupViewItem
      if (g.children.includes(targetId)) return id

      // search nested groups (if present)
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

function indexInParent(viewState: ViewState, parentId: string | null, id: string) {
  if (parentId == null) return viewState.order.indexOf(id)
  const parent = viewState.items[parentId] as GroupViewItem | undefined
  if (!parent || parent.type !== 'group') return -1
  return parent.children.indexOf(id)
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

  // Restore persisted view + selection (reconcile with users from API)
  useEffect(() => {
    if (!usersRaw) return
    let mounted = true

    try {
      const loaded = loadPersistedPayload() // null si aucune persistence
      const restored = buildRestoredPayload(loaded, usersRaw)

      if (!mounted) return

      // restore the viewState and the selection into the provider
      restoreViewState(restored.viewState)
      setSelection(restored.selectionState.selectedIds)

      // persist cleaned result immediately (ensures we store pruned/normalized state)
      try {
        savePersistedPayload(restored)
      } catch (e) {
        // best-effort - ignore errors in persistence
        console.warn('savePersistedPayload failed', e)
      }
    } catch (err) {
      console.error('error restoring persisted users view', err)
      // Fallback: if anything fails, fall back to initFromUsers so UI still loads
      initFromUsers(usersRaw)
    }

    return () => {
      mounted = false
    }
  }, [usersRaw, restoreViewState, setSelection, initFromUsers])

  // Build color map based on view state and users
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeItem = viewState.items[activeId]
    const overItem = viewState.items[overId]

    const activeParent = findParentId(viewState, activeId) // null for top-level
    const overParent = findParentId(viewState, overId) // null for top-level

    // Case 1: moving inside the same list (top-level or same group's children)
    if (activeParent === overParent) {
      if (activeParent === null) {
        // top-level reorder
        const oldIndex = viewState.order.indexOf(activeId)
        const newIndex = viewState.order.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = arrayMove(viewState.order, oldIndex, newIndex)
          reorder(newOrder)
        }
        return
      } else {
        // same group -> reinsert inside that group
        const parentId = activeParent
        const parent = viewState.items[parentId] as GroupViewItem
        const overIdx = parent.children.indexOf(overId)
        const insertIndex = overIdx // place before overId; adjust +1 for after
        addChildToGroup(parentId, activeId, insertIndex)
        return
      }
    }

    // Case 2: dropping ON ANOTHER USER => create a new group containing both (Android-like)
    if (
      (overItem?.type === 'user' || overItem?.type === 'alias') &&
      (activeItem?.type === 'user' || activeItem?.type === 'alias')
    ) {
      // Determine insertion index in top-level order (prefer to replace the over item position)
      let idx = 0
      if (overParent === null) {
        idx = viewState.order.indexOf(overId)
        if (idx === -1) idx = viewState.order.length
      } else {
        // target is inside a group — we choose to insert group next to that parent in top-level.
        idx = viewState.order.indexOf(overParent)
        if (idx === -1) idx = viewState.order.length
      }

      // create group with [overId, activeId]
      createGroup([overId, activeId], idx)
      return
    }

    // Case 3: dropping onto a GROUP -> add child to that group (append by default)
    if (overItem?.type === 'group') {
      const groupId = overId
      addChildToGroup(groupId, activeId)
      return
    }

    // Fallback: if over is within a group (overParent exists), insert before over inside that group
    if (overParent) {
      const parentId = overParent
      const parent = viewState.items[parentId] as GroupViewItem
      const overIdx = parent.children.indexOf(overId)
      const insertIndex = overIdx
      addChildToGroup(parentId, activeId, insertIndex)
      return
    }

    // Otherwise fallback to simple top-level reorder
    {
      const oldIndex = viewState.order.indexOf(activeId)
      const newIndex = viewState.order.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(viewState.order, oldIndex, newIndex)
        reorder(newOrder)
      }
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

  // renderItemContent returns the component for a given id (user/alias or group)
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
      // group header + its children (children wrapped in SortableContext)
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
          ) : viewState.order.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={viewState.order} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {viewState.order.map(id => (
                    <SortableItem id={id} key={id}>
                      {renderItemContent(id)}
                    </SortableItem>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="border-t bg-white p-4">
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
