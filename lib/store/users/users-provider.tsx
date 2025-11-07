'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

import {
  initialSelectionState,
  initialViewState,
  selectionActions,
  selectionReducer,
  viewActions,
  viewReducer,
  type SelectionState,
  type ViewState,
} from '@/lib/store'
import type { FUser } from '@/types'

type UserViewContextValue = {
  viewState: ViewState
  selectionState: SelectionState

  // view actions
  initFromUsers: (users: FUser[]) => void
  reorder: (newOrder: string[]) => void
  createAlias: (userId: number, index?: number) => void
  createGroup: (memberIds: string[], index?: number, name?: string) => void
  addChildToGroup: (groupId: string, childId: string, index?: number) => void
  deleteUser: (userId: number) => void
  deleteAlias: (id: string) => void
  deleteGroup: (id: string) => void
  renameGroup: (id: string, name: string) => void
  toggleCollapse: (id: string) => void

  // selection
  toggleSelection: (id: string) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void
  syncSelectionWithView: (useDisplayOrder?: boolean) => void
}

const UserViewContext = createContext<UserViewContextValue | undefined>(undefined)

export function UserViewProvider({ children }: { children: ReactNode }) {
  const [viewState, viewDispatch] = useReducer(viewReducer, initialViewState)
  const [selectionState, selectionDispatch] = useReducer(selectionReducer, initialSelectionState)

  // ✅ DEBUG : log quand la sélection change
  useEffect(() => {
    console.log(
      '%c[UserViewProvider] selectionState changed:',
      'color: #4ade80; font-weight: bold;',
      selectionState
    )
  }, [selectionState])

  // ✅ DEBUG : log quand la structure des items change
  useEffect(() => {
    console.log(
      '%c[UserViewProvider] viewState changed:',
      'color: #60a5fa; font-weight: bold;',
      viewState
    )
  }, [viewState])

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

  const addChildToGroup = useCallback(
    (groupId: string, childId: string, index?: number) => {
      viewDispatch(viewActions.addChildToGroup(groupId, childId, index))
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

  // Stable callbacks for selection actions (depend only on selectionDispatch)
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

  // syncSelectionWithView depends on current viewState because it uses it to compute sync action
  const syncSelectionWithView = useCallback(
    (useDisplayOrder?: boolean) => {
      selectionDispatch(selectionActions.syncWithView(viewState, !!useDisplayOrder))
    },
    [selectionDispatch, viewState]
  )

  const value = useMemo<UserViewContextValue>(() => {
    return {
      viewState,
      selectionState,

      initFromUsers,
      reorder,
      createAlias,
      createGroup,
      addChildToGroup,
      deleteUser,
      deleteAlias,
      deleteGroup,
      renameGroup,
      toggleCollapse,

      toggleSelection,
      setSelection,
      clearSelection,
      syncSelectionWithView,
    }
  }, [
    viewState,
    selectionState,
    initFromUsers,
    reorder,
    createAlias,
    createGroup,
    addChildToGroup,
    deleteUser,
    deleteAlias,
    deleteGroup,
    renameGroup,
    toggleCollapse,
    toggleSelection,
    setSelection,
    clearSelection,
    syncSelectionWithView,
  ])

  return <UserViewContext.Provider value={value}>{children}</UserViewContext.Provider>
}

export function useUsersViewStore() {
  const ctx = useContext(UserViewContext)
  if (!ctx) throw new Error('useUsersViewStore must be used within <UserViewProvider>')
  return ctx
}
