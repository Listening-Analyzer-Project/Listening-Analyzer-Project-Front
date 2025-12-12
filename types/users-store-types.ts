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