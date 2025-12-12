import { buildDisplayOrder, buildStructuralOrder } from '@/lib/utils/core-service';
import type { SelectionState, ViewState } from '@/types';

/* -------------------------
   Types & reducer
   ------------------------- */

export type SelectionAction =
  | { type: 'TOGGLE'; payload: { id: string } }
  | { type: 'SET'; payload: { ids: string[] } }
  | { type: 'CLEAR' }
  | { type: 'SYNC_WITH_VIEW'; payload: { viewState: ViewState; useDisplayOrder?: boolean } }

export const initialSelectionState: SelectionState = { selectedIds: [] }

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'TOGGLE': {
      const { id } = action.payload
      if (state.selectedIds.includes(id)) {
        return { selectedIds: state.selectedIds.filter(i => i !== id) }
      }
      return { selectedIds: [...state.selectedIds, id] }
    }
    case 'SET':
      return { selectedIds: [...action.payload.ids] }
    case 'CLEAR':
      return { selectedIds: [] }
    case 'SYNC_WITH_VIEW': {
      const { viewState, useDisplayOrder } = action.payload
      const order = useDisplayOrder ? buildDisplayOrder(viewState) : buildStructuralOrder(viewState)
      const orderSet = new Set(order)
      const present = state.selectedIds.filter(id => orderSet.has(id))
      const reordered: string[] = []
      for (const id of order) {
        if (present.includes(id)) reordered.push(id)
      }
      return { selectedIds: reordered }
    }
    default:
      return state
  }
}

/* -------------------------
   Sync helper (pure)
   ------------------------- */

export function syncSelectionWithView(
  viewState: ViewState,
  current: SelectionState,
  useDisplayOrder = false
): SelectionState {
  const order = useDisplayOrder ? buildDisplayOrder(viewState) : buildStructuralOrder(viewState)
  const orderSet = new Set(order)
  const present = current.selectedIds.filter(id => orderSet.has(id))
  const reordered: string[] = []
  for (const id of order) if (present.includes(id)) reordered.push(id)
  return { selectedIds: reordered }
}

/* -------------------------
   Ordered selection helper
   ------------------------- */

export function getOrderedSelection(selectedIds: string[], viewState: ViewState): string[] {
  const structuralOrder = buildStructuralOrder(viewState)
  return selectedIds.sort((a, b) => structuralOrder.indexOf(a) - structuralOrder.indexOf(b))
}

/* -------------------------
   Action creators
   ------------------------- */

export const selectionActions = {
  toggle: (id: string): SelectionAction => ({ type: 'TOGGLE', payload: { id } }),
  set: (ids: string[]): SelectionAction => ({ type: 'SET', payload: { ids } }),
  clear: (): SelectionAction => ({ type: 'CLEAR' }),
  syncWithView: (viewState: ViewState, useDisplayOrder = false): SelectionAction => ({
    type: 'SYNC_WITH_VIEW',
    payload: { viewState, useDisplayOrder },
  }),
}
