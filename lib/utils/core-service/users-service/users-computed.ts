import type { ViewState } from '@/types'
import { isGroup } from './users-helpers'

/**
 * @param viewState - The current view state
 * @returns Array of all item IDs in structural order
 */
export function buildStructuralOrder(viewState: ViewState): string[] {
  const res: string[] = []
  
  const visit = (id: string) => {
    res.push(id)
    const it = viewState.items[id]
    if (!it) return
    
    if (isGroup(it)) {
      for (const c of it.children) {
        visit(c)
      }
    }
  }
  
  for (const id of viewState.order) {
    visit(id)
  }
  
  return res
}

/**
 * @param viewState - The current view state
 * @returns Array of visible item IDs in display order
 */
export function buildDisplayOrder(viewState: ViewState): string[] {
  const res: string[] = []
  
  const visit = (id: string) => {
    res.push(id)
    const it = viewState.items[id]
    if (!it) return
    
    if (isGroup(it)) {
      const collapsed = !!viewState.collapseMap[id]
      if (!collapsed) {
        for (const c of it.children) {
          visit(c)
        }
      }
    }
  }
  
  for (const id of viewState.order) {
    visit(id)
  }
  
  return res
}
