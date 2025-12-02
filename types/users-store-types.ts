/**
 * Types for the users view and selection stores
 * Defines the structure for managing users, aliases, and groups in the UI
 */

/**
 * ViewItem represents either a user/alias or a group
 * Discriminated union based on the presence of userId vs children
 */
export type ViewItem = 
  | { id: string; userId: number; isAlias?: boolean }  // User or Alias
  | { id: string; children: string[]; name?: string }   // Group

/**
 * ViewState manages the complete state of the users view
 */
export type ViewState = {
  items: Record<string, ViewItem>
  order: string[] // top-level order of view ids
  nextId: number // local counter for a:... and g:...
  collapseMap: Record<string, boolean>
}

/**
 * SelectionState tracks which items are currently selected
 */
export type SelectionState = {
  selectedIds: string[] // ordered according to structural order
}

/**
 * PersistedPayload is the structure saved to localStorage
 */
export type PersistedPayload = {
  viewState: ViewState
  selectionState: SelectionState
  meta?: { savedAt?: string }
}
