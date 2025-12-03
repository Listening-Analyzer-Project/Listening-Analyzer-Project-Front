'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { USER_UPDATED_EVENT } from '@/lib/events'

// dnd-kit
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

import { Button } from '@/components/ui/button'
import { userService } from '@/lib/api'
import { useApi } from '@/lib/hooks'
import { useUsersViewStore } from '@/lib/store/users/users-provider'
import {
  buildRestoredPayload,
  loadPersistedPayload
} from '@/lib/store/users/users-view-persistence'
import { showErrorToast } from '@/lib/utils'
import { buildColorMap, isGroup, isItem } from '@/lib/utils/core-service'
import type { FUser, ViewState } from '@/types'
import DeletionDialog from '../others/deletion-dialog'
import AvatarStack from './avatar-stack'

import SortableItem from './sortable-user-item'
import UserCreateDialog from './user-create-dialog'
import UserItem from './user-item'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortlist' as const

function findParentId(viewState: ViewState, targetId: string): string | null {
  for (const id of viewState.order) {
    const it = viewState.items[id]
    if (!isGroup(it)) continue
    if (it.children.includes(targetId)) return id
  }
  return null
}

export default function UsersMenu() {
  const {
    data: usersRaw,
    loading,
    refetch,
  } = useApi<FUser[]>(() => userService.fetchAll(), [])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Failsafe: If mounted, no data, and not loading -> Force fetch
  useEffect(() => {
    if (mounted && !usersRaw && !loading) {
      refetch()
    }
  }, [mounted, usersRaw, loading, refetch])

  useEffect(() => {
    const handleUserUpdate = () => {
      refetch()
    }

    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdate)

    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdate)
    }
  }, [refetch])

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
    addChildrenToGroup,
    removeChildrenFromGroup,
    mergeGroups,
    restoreViewState,
    setSelection,
    createAlias,
  } = useUsersViewStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDeleteId, setToDeleteId] = useState<string | null>(null)
  const [toDeleteType, setToDeleteType] = useState<'user' | 'alias' | 'group' | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [preCollapseMap, setPreCollapseMap] = useState<Record<string, boolean> | null>(null)
  const [viewInitialized, setViewInitialized] = useState(false)


  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Analyze selection
  const selectedIds = selectionState.selectedIds
  const selectedItems = selectedIds.map(id => viewState.items[id]).filter(Boolean)
  const selectedGroups = selectedItems.filter(isGroup)
  const selectedUsers = selectedItems.filter(isItem)

  // Button is enabled when:
  // - 2+ items selected (users/groups) OR
  // - 1 child item selected (to remove from group)
  // - BUT NOT when multiple groups + users are selected together (ambiguous action)
  // - BUT NOT when 1 group + its own children are selected (already in that group)
  // Compute whether this is a single child removal case
  const isSingleChildRemoval = useMemo(() => {
    if (selectedIds.length === 1 && selectedUsers.length === 1) {
      const parentId = findParentId(viewState, selectedUsers[0].id)
      return !!parentId
    }
    return false
  }, [selectedIds.length, selectedUsers, viewState])

  // Compute whether the group action button should be enabled
  const canCreateGroup = useMemo(() => {
    let can = selectedIds.length >= 2 && !(selectedGroups.length > 1 && selectedUsers.length > 0)
    
    if (isSingleChildRemoval) {
      can = true
    }
    
    if (selectedGroups.length === 1 && selectedUsers.length > 0 && !isSingleChildRemoval) {
      const group = selectedGroups[0]
      const anyUserIsChild = selectedUsers.some(u => group.children.includes(u.id))
      if (anyUserIsChild) {
        can = false
      }
    }
    
    return can
  }, [selectedIds.length, selectedGroups, selectedUsers, isSingleChildRemoval])

  // Compute the action button label based on current selection
  const actionLabel = useMemo(() => {
    if (isSingleChildRemoval) {
      return 'Sortir du groupe'
    } else if (selectedGroups.length === 1 && selectedUsers.length > 0) {
      return 'Ajouter au groupe'
    } else if (selectedGroups.length > 1) {
      return 'Fusionner groupes'
    }
    return 'Créer groupe'
  }, [isSingleChildRemoval, selectedGroups.length, selectedUsers.length])

 useEffect(() => {
    // Safety check: don't run if no users or already initialized
    if (!usersRaw || viewInitialized) return
    
    const doRestore = () => {
      try {
        let loaded
        
        try {
            loaded = loadPersistedPayload()
        } catch (e) {
            console.warn('[UsersMenu] LocalStorage corrupted, resetting view.', e)
            throw e 
        }

        const restored = buildRestoredPayload(loaded, usersRaw)
        restoreViewState(restored.viewState)
        setSelection(restored.selectionState.selectedIds)
        setViewInitialized(true)
        
      } catch (err) {
        console.error('[UsersMenu] Restoration failed, initializing from scratch', err)
        
        // Fallback: Initialize standard view if storage is broken
        initFromUsers(usersRaw)
        setViewInitialized(true)
      }
    }
    
    doRestore()
  }, [usersRaw, restoreViewState, setSelection, initFromUsers, viewInitialized])

  const usersById = new Map(
    usersRaw
      ?.filter((u): u is FUser & { id: number } => u.id !== undefined && u.id !== null)
      .map(u => [u.id, u]) ?? []
  )

  const colorMap = buildColorMap(
    viewState,
    BASE_COLOR_HEX,
    EQU_DIST_COUNT,
    LUMINANCE_PRESET
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    const draggedId = String(event.active.id)
    setActiveId(draggedId)
    
    const parentId = findParentId(viewState, draggedId)
    
    // If dragging a root item or group (not a child), collapse all groups
    if (parentId === null) {
      setPreCollapseMap({ ...viewState.collapseMap })
      
      const allGroupIds = viewState.order.filter(id => {
        const item = viewState.items[id]
        return isGroup(item)
      })
      
      allGroupIds.forEach(groupId => {
        if (!viewState.collapseMap[groupId]) {
          toggleCollapse(groupId)
        }
      })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    
    // Restore collapse state if we had saved it
    if (preCollapseMap) {
      Object.keys(preCollapseMap).forEach(groupId => {
        const wasCollapsed = preCollapseMap[groupId]
        const isCurrentlyCollapsed = !!viewState.collapseMap[groupId]
        
        if (wasCollapsed !== isCurrentlyCollapsed) {
          toggleCollapse(groupId)
        }
      })
      viewState.order.forEach(id => {
        const item = viewState.items[id]
        if (isGroup(item) && !(id in preCollapseMap)) {
          const isCurrentlyCollapsed = !!viewState.collapseMap[id]
          if (isCurrentlyCollapsed) {
            toggleCollapse(id)
          }
        }
      })
      
      setPreCollapseMap(null)
    }
    
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeParent = findParentId(viewState, activeId)
    const overParent = findParentId(viewState, overId)

    // STRICT RESTRICTION: Only allow drag if parents are identical.
    if (activeParent !== overParent) {
      return
    }

    // If parents are same, it's a reorder
    if (activeParent === null) {
      const oldIndex = viewState.order.indexOf(activeId)
      const newIndex = viewState.order.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorder(arrayMove(viewState.order, oldIndex, newIndex))
      }
    } else {
      const parent = viewState.items[activeParent]
      if (isGroup(parent)) {
        const insertIndex = parent.children.indexOf(overId)
        addChildrenToGroup(activeParent, [activeId], insertIndex)
      }
    }
  }

  const handleCreateUser = async (payload: Partial<FUser>) => {
    try {
      await userService.create(payload)
      await refetch()
      setDialogOpen(false)
    } catch (err) {
      showErrorToast(err, 'User creation failed')
    }
  }

  const handleDelete = async (id: string, type: 'user' | 'alias' | 'group') => {
    try {
      // Collect all IDs to remove from selection
      const idsToRemove = new Set<string>([id])
      
      if (type === 'user') {
        const userId = parseInt(id.split(':')[1])
        // Also remove all aliases of this user
        Object.keys(viewState.items).forEach(itemId => {
          const item = viewState.items[itemId]
          if (isItem(item) && item.isAlias && item.userId === userId) {
            idsToRemove.add(itemId)
          }
        })
        deleteUser(userId)
        await userService.remove(userId)
      } else if (type === 'alias') {
        deleteAlias(id)
      } else if (type === 'group') {
        // Also remove all children of this group
        const group = viewState.items[id]
        if (isGroup(group)) {
          group.children.forEach(childId => idsToRemove.add(childId))
        }
        deleteGroup(id)
      }
      
      // Clean up selection to remove deleted items
      const newSelection = selectionState.selectedIds.filter(selId => !idsToRemove.has(selId))
      setSelection(newSelection)
      
      await refetch()
    } catch (err) {
      showErrorToast(err, 'User deletion failed')
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
      showErrorToast(err, 'Alias creation failed')
    }
  }

  const handleSmartGroupAction = () => {
    // Case 1: Single child - remove from group
    if (selectedIds.length === 1 && selectedUsers.length === 1) {
      const userId = selectedUsers[0].id
      const parentId = findParentId(viewState, userId)
      if (parentId) {
        removeChildrenFromGroup([userId])
        setSelection([])
        return
      }
    }

    if (selectedGroups.length === 0) {
      // Case 2: Only users -> Create new group
      if (selectedUsers.length < 2) return

      const firstId = selectedIds[0]
      
      let index = viewState.order.indexOf(firstId)
      
      if (index === -1) {
        const parentId = findParentId(viewState, firstId)
        if (parentId) {
          const parentIndex = viewState.order.indexOf(parentId)
          index = parentIndex !== -1 ? parentIndex + 1 : 0
        } else {
          index = 0
        }
      }

      createGroup(selectedIds, index)
    } else if (selectedGroups.length === 1) {
      // Case 3: 1 Group + Users -> Add users to group
      const targetGroup = selectedGroups[0]
      const usersToAdd = selectedUsers.map(u => u.id)
      
      if (usersToAdd.length > 0) {
        addChildrenToGroup(targetGroup.id, usersToAdd)
      }
    } else {
      // Case 4: Multiple Groups -> Merge
      let targetGroup = selectedGroups[0]
      let minIndex = viewState.order.indexOf(targetGroup.id)
      
      for (let i = 1; i < selectedGroups.length; i++) {
        const idx = viewState.order.indexOf(selectedGroups[i].id)
        if (idx !== -1 && idx < minIndex) {
          minIndex = idx
          targetGroup = selectedGroups[i]
        }
      }
      
      const sourceGroupIds = selectedGroups
        .filter(g => g.id !== targetGroup.id)
        .map(g => g.id)
      
      if (sourceGroupIds.length > 0) {
        mergeGroups(targetGroup.id, sourceGroupIds)
      }
    }
    
    setSelection([])
  }

  const renderItemContent = (id: string, depth = 0) => {
    const item = viewState.items[id]
    if (!item) return null
    const isSelected = selectionState.selectedIds.includes(id)
    const isCollapsed = !!viewState.collapseMap[id]

    if (!mounted) return null
    
    if (isItem(item)) {
      return (
        <UserItem
          key={id}
          item={item}
          usersById={usersById}
          selected={isSelected}
          onToggleSelect={toggleSelection}
          onDelete={handleDeleteClick}
          onAfterUserRename={refetch}
          onCreateAlias={handleCreateAlias}
          color={colorMap.get(id) ?? colorMap.get(String(item.userId))}
          onCloseMenu={() => setMenuOpen(false)}
        />
      )
    } else if (isGroup(item)) {
      return (
        <div key={id} className="space-y-1">
          <UserItem
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
              items={item.children}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {item.children.map(childId => (
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
              {(() => {
                const showLoading = !usersRaw || loading || !viewInitialized
                const orderLength = viewState.order.length
                
                if (showLoading) {
                  return <div>Chargement...</div>
                }
                
                if (orderLength === 0) {
                  return <div className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</div>
                }
                
                return (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    modifiers={[({ transform }) => ({ ...transform, x: 0 })]}
                    autoScroll={{
                      enabled: true,
                      threshold: { x: 0.15, y: 0.15 },
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
                )
              })()}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t bg-white p-4 flex gap-2">
          <Button
            onClick={() => {
              setDialogOpen(true)
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            + Utilisateur
          </Button>
          <Button
            className="flex-1"
            disabled={!canCreateGroup}
            onClick={handleSmartGroupAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>

      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <DeletionDialog
        open={deleteDialogOpen}
        onOpenChange={v => {
          setDeleteDialogOpen(v)
          if (!v) {
            setToDeleteId(null)
            setToDeleteType(null)
          }
        }}
        onConfirm={handleConfirmDelete}
        title = "Supprimer l'utilisateur ?"
      />

      <UserCreateDialog
        open={dialogOpen}
        onOpenChange={v => {
          setDialogOpen(v)
        }}
        onCreate={async payload => {
          const user = {
            ...payload,
            isadmin: payload.isadmin ? 1 : 0,
          }
          await handleCreateUser(user)
        }}
      />
    </>
  )
}
