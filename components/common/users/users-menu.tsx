'use client'

import { Button } from '@/components/ui/button'
import { userService } from '@/lib/api'
import { useApi } from '@/lib/hooks'
import { useUsersViewStore } from '@/lib/store/users/users-provider'
import {
  buildRestoredPayload,
  loadPersistedPayload,
  savePersistedPayload,
} from '@/lib/store/users/users-view-persistence'
import type { GroupViewItem, ViewState } from '@/lib/store/users/users-view-store'
import { buildColorMap } from '@/lib/store/users/users-view-store'
import type { FUser } from '@/types'
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import AvatarStack from './avatar-stack'
import UserDeletionDialog from './user-deletion-dialog'
import UserDialog from './user-dialog'
import UserItem from './user-item'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortlist' as const

function SortableItem({
  id,
  children,
  depth = 0,
  disabled = false,
}: {
  id: string
  children: React.ReactNode
  depth?: number
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start">
        <div className="flex-1 min-w-0" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          {children}
        </div>
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag user"
          className="p-1 ml-2 rounded hover:bg-gray-100 mt-2"
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
  const [activeId, setActiveId] = useState<string | null>(null)


  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const canCreateGroup =
    selectionState.selectedIds.length > 1 &&
    selectionState.selectedIds.every(
      (id, _, arr) => findParentId(viewState, id) === findParentId(viewState, arr[0])
    )

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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeParent = findParentId(viewState, activeId)
    const overParent = findParentId(viewState, overId)

    // STRICT RESTRICTION: Only allow drag if parents are identical.
    // This prevents dragging in/out of groups, and prevents auto-group creation.
    if (activeParent !== overParent) {
      return
    }

    // If parents are same, it's a reorder
    if (activeParent === null) {
      // Root reorder
      const oldIndex = viewState.order.indexOf(activeId)
      const newIndex = viewState.order.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorder(arrayMove(viewState.order, oldIndex, newIndex))
      }
    } else {
      // Group reorder
      const parent = viewState.items[activeParent] as GroupViewItem
      const insertIndex = parent.children.indexOf(overId)
      // addChildToGroup handles moving the child to the new index within the same group
      addChildToGroup(activeParent, activeId, insertIndex)
    }
  }

  const handleSave = async (payload: Partial<FUser> & { id?: number }) => {
    try {
      const savedUser = payload.id
        ? await userService.update(payload.id, payload)
        : await userService.create(payload)
      await refetch()
      setDialogOpen(false)
      setEditingUser(null)
      if (savedUser.id && onSelect) onSelect(savedUser)
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
    if (type === 'alias' || type === 'group') {
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

  const handleCreateGroupClick = () => {
    const selectedIds = selectionState.selectedIds
    if (selectedIds.length < 2) return

    const firstId = selectedIds[0]
    const parentId = findParentId(viewState, firstId)

    let index = 0
    if (parentId) {
      const parent = viewState.items[parentId] as GroupViewItem
      index = parent.children.indexOf(firstId)
    } else {
      index = viewState.order.indexOf(firstId)
    }

    if (index === -1) index = 0

    createGroup(selectedIds, index)
    setSelection([])
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
          <UserItem
            id={id}
            item={item}
            usersById={usersById}
            selected={isSelected}
            onToggleSelect={toggleSelection}
            onRenameGroup={handleRenameGroup}
            onToggleCollapse={toggleCollapse}
            collapsed={isCollapsed}
            onDelete={handleDeleteClick}
            color={colorMap.get(id)}
          />
          {!isCollapsed && (
            <SortableContext
              items={(item as GroupViewItem).children}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {(item as GroupViewItem).children.map(childId => (
                  <SortableItem
                    id={childId}
                    key={childId}
                    depth={depth + 1}
                    disabled={
                      activeId !== null && findParentId(viewState, activeId) !== id
                    }
                  >
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
          style={{ boxShadow: 'none' }}
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

        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ maxHeight: 'calc(100vh - 140px)', height: '100%' }}
          >
            <div className="px-4 pt-4 pb-4">
              {loading ? (
                <div>Chargement...</div>
              ) : viewState.order.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[({ transform }) => ({ ...transform, x: 0 })]}
                  autoScroll={{
                    enabled: true,
                    threshold: { x: 0.08, y: 0.08 },
                    layoutShiftCompensation: false,
                    acceleration: 2,
                    interval: 10,
                  }}
                >
                  <SortableContext items={viewState.order} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {viewState.order.map(id => (
                        <SortableItem
                          id={id}
                          key={id}
                          disabled={
                            activeId !== null && findParentId(viewState, activeId) !== null
                          }
                        >
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

        <div className="flex-shrink-0 border-t bg-white p-4 flex gap-2">
          <Button
            onClick={() => {
              setEditingUser(null)
              setDialogOpen(true)
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            + utilisateur
          </Button>
          <Button
            className="flex-1"
            disabled={!canCreateGroup}
            onClick={handleCreateGroupClick}
          >
            + groupe
          </Button>
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
        defaultValues={editingUser ? { ...editingUser, isadmin: !!editingUser.isadmin } : undefined}
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
