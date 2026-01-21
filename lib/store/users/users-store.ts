import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { buildStructuralOrder } from '@/lib/utils/core-service'
import type { ViewState } from '@/types'
import type { UsersStore } from '@/types/users-store-types'
import { createSelectionModule } from './modules/selection-module'
import { createViewModule } from './modules/view-module'

/* -------------------------------------------------------------------------- */
/*                                    Store                                   */
/* -------------------------------------------------------------------------- */

export function getOrderedSelection(selectedIds: string[], viewState: ViewState): string[] {
  const structuralOrder = buildStructuralOrder(viewState)
  return [...selectedIds].sort((a, b) => structuralOrder.indexOf(a) - structuralOrder.indexOf(b))
}

export const useUsersStore = create<UsersStore>()(
  persist(
    immer((...a) => ({
      ...createViewModule(...a),
      ...createSelectionModule(...a),
    })),
    {
      name: 'users-store-v2', // Unique name for localStorage
      partialize: (state) => ({ 
          viewState: state.viewState, 
          selectionState: state.selectionState 
        }),
    }
  )
)
