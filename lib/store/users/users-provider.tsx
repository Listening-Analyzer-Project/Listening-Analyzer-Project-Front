'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'

import {
  initialSelectionState,
  initialViewState,
  selectionActions,
  selectionReducer,
  viewActions,
  viewReducer,
} from '@/lib/store'
import type { FUser, SelectionState, ViewState } from '@/types'

// Persistence helpers (localStorage payload containing viewState + selectionState)
import type { PersistedPayload } from '@/types'
import {
  clearPersistedPayload,
  savePersistedPayload,
} from './users-view-persistence'

type UserViewContextValue = {
  viewState: ViewState
  selectionState: SelectionState

  // view actions
  initFromUsers: (users: FUser[]) => void
  reorder: (newOrder: string[]) => void
  createAlias: (userId: number, index?: number) => void
  createGroup: (memberIds: string[], index?: number, name?: string) => void
  addChildrenToGroup: (groupId: string, childIds: string[], index?: number) => void
  removeChildrenFromGroup: (childIds: string[]) => void
  mergeGroups: (targetGroupId: string, sourceGroupIds: string[]) => void
  deleteUser: (userId: number) => void
  deleteAlias: (id: string) => void
  deleteGroup: (id: string) => void
  renameGroup: (id: string, name: string) => void
  toggleCollapse: (id: string) => void

  // selection
  toggleSelection: (id: string) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void

  // persistence helpers
  restoreViewState: (vs: ViewState) => void
  clearPersistedState: () => void
}

const UserViewContext = createContext<UserViewContextValue | undefined>(undefined)

export function UserViewProvider({ children }: { children: ReactNode }) {
  const [viewState, viewDispatch] = useReducer(viewReducer, initialViewState)
  const [selectionState, selectionDispatch] = useReducer(selectionReducer, initialSelectionState)

  // Stable callbacks for view actions (depend only on dispatch which is stable)
  const initFromUsers = useCallback(
    (users: FUser[]) => {
      viewDispatch(viewActions.initFromUsers(users))
    },
    [viewDispatch]
  )

  const reorder = useCallback(
    (newOrder: string[]) => {
      viewDispatch(viewActions.reorder(newOrder))
    },
    [viewDispatch]
  )

  const createAlias = useCallback(
    (userId: number, index?: number) => {
      viewDispatch(viewActions.createAlias(userId, index))
    },
    [viewDispatch]
  )

  const createGroup = useCallback(
    (memberIds: string[], index?: number, name?: string) => {
      viewDispatch(viewActions.createGroup(memberIds, index, name))
    },
    [viewDispatch]
  )

  const addChildrenToGroup = useCallback(
    (groupId: string, childIds: string[], index?: number) => {
      viewDispatch(viewActions.addChildrenToGroup(groupId, childIds, index))
    },
    [viewDispatch]
  )

  const mergeGroups = useCallback(
    (targetGroupId: string, sourceGroupIds: string[]) => {
      viewDispatch(viewActions.mergeGroups(targetGroupId, sourceGroupIds))
    },
    [viewDispatch]
  )

  const removeChildrenFromGroup = useCallback(
    (childIds: string[]) => {
      viewDispatch(viewActions.removeChildrenFromGroup(childIds))
    },
    [viewDispatch]
  )

  const deleteUser = useCallback(
    (userId: number) => {
      viewDispatch(viewActions.deleteUser(userId))
    },
    [viewDispatch]
  )

  const deleteAlias = useCallback(
    (id: string) => {
      viewDispatch(viewActions.deleteAlias(id))
    },
    [viewDispatch]
  )

  const deleteGroup = useCallback(
    (id: string) => {
      viewDispatch(viewActions.deleteGroup(id))
    },
    [viewDispatch]
  )

  const renameGroup = useCallback(
    (id: string, name: string) => {
      viewDispatch(viewActions.renameGroup(id, name))
    },
    [viewDispatch]
  )

  const toggleCollapse = useCallback(
    (id: string) => {
      viewDispatch(viewActions.toggleCollapse(id))
    },
    [viewDispatch]
  )

  // Selection actions
  const toggleSelection = useCallback(
    (id: string) => {
      selectionDispatch(selectionActions.toggle(id))
    },
    [selectionDispatch]
  )

  const setSelection = useCallback(
    (ids: string[]) => {
      selectionDispatch(selectionActions.set(ids))
    },
    [selectionDispatch]
  )

  const clearSelection = useCallback(() => {
    selectionDispatch(selectionActions.clear())
  }, [selectionDispatch])

  // Persistence: restore (dispatches RESTORE_VIEWSTATE)
  const restoreViewState = useCallback(
    (vs: ViewState) => {
      viewDispatch(viewActions.restoreViewState(vs))
    },
    [viewDispatch]
  )

  // Clear persisted payload (localStorage)
  const clearPersistedState = useCallback(() => {
    try {
      clearPersistedPayload()
    } catch (e) {
      console.error('clearPersistedPayload failed', e)
    }
  }, [])

  // Autosave debounced: persist viewState + selectionState to localStorage
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // debounce writes to avoid blocking on many quick changes
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    saveTimerRef.current = window.setTimeout(() => {
      try {
        // Build payload and save synchronously (localStorage)
        const payload: PersistedPayload = {
          viewState,
          selectionState,
          meta: { savedAt: new Date().toISOString() },
        }
        savePersistedPayload(payload)
      } catch (e) {
        console.error('savePersistedPayload failed', e)
      } finally {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
      }
    }, 300)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [viewState, selectionState])

  // Expose context value
  const value = useMemo<UserViewContextValue>(() => {
    return {
      viewState,
      selectionState,
      initFromUsers,
      reorder,
      createAlias,
      createGroup,
      addChildrenToGroup,
      removeChildrenFromGroup,
      mergeGroups,
      deleteUser,
      deleteAlias,
      deleteGroup,
      renameGroup,
      toggleCollapse,
      toggleSelection,
      setSelection,
      clearSelection,
      restoreViewState,
      clearPersistedState,
    }
  }, [
    viewState,
    selectionState,
    initFromUsers,
    reorder,
    createAlias,
    createGroup,
    addChildrenToGroup,
    removeChildrenFromGroup,
    mergeGroups,
    deleteUser,
    deleteAlias,
    deleteGroup,
    renameGroup,
    toggleCollapse,
    toggleSelection,
    setSelection,
    clearSelection,
    restoreViewState,
    clearPersistedState,
  ])

  return <UserViewContext.Provider value={value}>{children}</UserViewContext.Provider>
}

export function useUsersViewStore() {
  const ctx = useContext(UserViewContext)
  if (!ctx) throw new Error('useUsersViewStore must be used within <UserViewProvider>')
  return ctx
}
