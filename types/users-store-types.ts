import type { FUser } from './bdd-types-front';

// --- State Definitions ---

export type ViewItem = 
  | { id: string; userId: number; isAlias?: boolean }  // User or Alias
  | { id: string; children: string[]; name?: string }   // Group

export type ViewState = {
  items: Record<string, ViewItem>
  order: string[] // top-level order of view ids
  nextId: number // local counter for a:... and g:...
  collapseMap: Record<string, boolean>
}

export type SelectionState = {
  selectedIds: string[] // ordered according to structural order
}

export type PersistedPayload = {
  viewState: ViewState
  selectionState: SelectionState
  meta?: { savedAt?: string }
}

// --- Module Interfaces ---

export interface ViewModule {
    viewState: ViewState
    initFromUsers: (users: FUser[]) => void
    reconcile: (users: FUser[]) => void
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
}

export interface SelectionModule {
    selectionState: SelectionState
    toggleSelection: (id: string) => void
    setSelection: (ids: string[]) => void
    clearSelection: () => void
    syncSelection: (useDisplayOrder?: boolean) => void
}

export type UsersStore = ViewModule & SelectionModule