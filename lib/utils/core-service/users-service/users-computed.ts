/**
 * Users Service Computed Values
 * 
 * Functions that compute derived data from view state:
 * - Color mappings for visual consistency
 * - Ordering for selection and display
 */

import type { LuminancePreset } from '@/lib/utils'
import { getCyclicColor } from '@/lib/utils'
import type { ViewState } from '@/types'
import { isGroup, isItem, makeUserViewId } from './users-helpers'

/* ========================= COLOR SERVICE ========================= */

/**
 * Build a color map for all items in the view
 * 
 * - Groups get unique colors
 * - Users and their aliases share the same color (based on userId)
 * - Colors are assigned cyclically to ensure variety
 * 
 * @param viewState - The current view state
 * @param baseColor - Base color to generate variants from (default: '#16A34A')
 * @param count - Number of color variants to generate (default: 8)
 * @param preset - Luminance preset for color generation (default: 'shortlist')
 * @returns Map of item IDs to color strings
 */
export function buildColorMap(
  viewState: ViewState,
  baseColor: string = '#16A34A',
  count: number = 8,
  preset: LuminancePreset = 'shortlist'
): Map<string, string> {
  const colorMap = new Map<string, string>()
  let colorIndex = 0

  const assignColorsToItems = (itemIds: string[]) => {
    for (const id of itemIds) {
      const item = viewState.items[id]
      if (!item) continue

      if (isGroup(item)) {
        // Group gets new color
        const groupColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
        colorMap.set(id, groupColor)
        // Recurse for children
        assignColorsToItems(item.children)
      } else if (isItem(item)) {
        // Users and aliases share the same color based on userId
        const numericKey = String(item.userId)
        let userColor = colorMap.get(numericKey)

        if (!userColor) {
          userColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
          colorMap.set(numericKey, userColor)
          // Also set for the main user view id if it exists, for consistency/lookup
          const mainUserViewId = makeUserViewId(item.userId)
          colorMap.set(mainUserViewId, userColor)
        }

        colorMap.set(id, userColor)
      }
    }
  }

  assignColorsToItems(viewState.order)
  return colorMap
}

/* ========================= ORDER SERVICE ========================= */

/**
 * Build structural order of all items in the view
 * 
 * Returns a flat array of all item IDs in hierarchical order,
 * regardless of collapse state. Useful for:
 * - Selection ordering
 * - Drag-and-drop operations
 * - Data integrity checks
 * 
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
 * Build display order of visible items in the view
 * 
 * Returns a flat array of item IDs that should be visible,
 * respecting the collapse state of groups. Useful for:
 * - Rendering the UI
 * - Computing visible selections
 * - Scroll calculations
 * 
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
