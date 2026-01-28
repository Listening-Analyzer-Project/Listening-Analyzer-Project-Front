import { StateCreator } from 'zustand'

import {
    buildDisplayOrder,
    buildStructuralOrder
} from '@/lib/utils/core-service'
import type { SelectionModule, SelectionState, UsersStore } from '@/types/users-store-types'

const initialSelectionState: SelectionState = {
    selectedIds: [],
}

export const createSelectionModule: StateCreator<
    UsersStore,
    [["zustand/immer", never]],
    [],
    SelectionModule
> = (set, get) => ({
    selectionState: initialSelectionState,

    toggleSelection: (id) => {
        set((state) => {
            if (state.selectionState.selectedIds.includes(id)) {
                state.selectionState.selectedIds = state.selectionState.selectedIds.filter((i: string) => i !== id)
            } else {
                state.selectionState.selectedIds.push(id)
            }
        })
    },

    setSelection: (ids) => {
        set((state) => {
            state.selectionState.selectedIds = ids
        })
    },

    clearSelection: () => {
        set((state) => {
            state.selectionState.selectedIds = []
        })
    },

    syncSelection: (useDisplayOrder = false) => {
        set((state) => {
            // Access state.viewState to build order
            const order = useDisplayOrder 
                ? buildDisplayOrder(state.viewState) 
                : buildStructuralOrder(state.viewState)
            
            const orderSet = new Set(order)
            const present = state.selectionState.selectedIds.filter((id: string) => orderSet.has(id))
            const reordered: string[] = []
            for (const id of order) {
                if (present.includes(id)) reordered.push(id)
            }
            state.selectionState.selectedIds = reordered
        })
    }
})
