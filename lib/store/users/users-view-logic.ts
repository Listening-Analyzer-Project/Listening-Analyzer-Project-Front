import type { LuminancePreset } from '@/lib/utils'
import { getCyclicColor } from '@/lib/utils'
// TODO : Refactor ce fichié ainsi que les autres fichiers du store potentiellement pour dissocier les logiques d'enregistrement pure et de persistance de ce qui peux etre plus affilié à un service
/* ------------------------- Types ------------------------- */
export type ViewItemType = 'user' | 'alias' | 'group'

export type UserViewItem = { id: string; type: 'user'; userId: number }
export type AliasViewItem = { id: string; type: 'alias'; userId: number }
export type GroupViewItem = { id: string; type: 'group'; children: string[]; name?: string }

export type ViewItem = UserViewItem | AliasViewItem | GroupViewItem

export type ViewState = {
  items: Record<string, ViewItem>
  order: string[] // top-level order of view ids
  nextId: number // local counter for a:... and g:...
  collapseMap: Record<string, boolean>
}

/* ------------------------- Id helpers ------------------------- */
export const makeUserViewId = (userId: number) => `u:${userId}`
export const makeAliasViewId = (userId: number, localId: number) => `a:${userId}:${localId}`
export const makeGroupViewId = (localId: number) => `g:${localId}`

/* ------------------------- Pure helpers ------------------------- */
export function findParent(items: Record<string, ViewItem>, targetId: string): string | null {
  for (const [id, it] of Object.entries(items)) {
    if (it.type === 'group' && (it as GroupViewItem).children.includes(targetId)) return id
  }
  return null
}

export function removeIdFromAll(items: Record<string, ViewItem>, order: string[], idToRemove: string) {
  const itemsCopy: Record<string, ViewItem> = {}
  for (const [k, v] of Object.entries(items)) {
    if (v.type === 'group') {
      const g = v as GroupViewItem
      itemsCopy[k] = { ...g, children: g.children.filter(c => c !== idToRemove) }
    } else {
      itemsCopy[k] = v
    }
  }
  const orderCopy = order.filter(i => i !== idToRemove)
  return { items: itemsCopy, order: orderCopy }
}

export function removeIds(items: Record<string, ViewItem>, order: string[], ids: string[]) {
  let itemsCopy = { ...items }
  let orderCopy = [...order]
  for (const id of ids) {
    const res = removeIdFromAll(itemsCopy, orderCopy, id)
    itemsCopy = res.items
    orderCopy = res.order
    // also delete the item itself from itemsCopy
    delete itemsCopy[id]
  }
  return { items: itemsCopy, order: orderCopy }
}

// Kill groups with <=1 child:
// - If group has 0 child -> delete group
// - If group has 1 child -> remove group and "extract" its only child:
// This operation is applied repeatedly until no group has <=1 child.
export function killGroups(items: Record<string, ViewItem>, order: string[]) {
  let itemsCopy = { ...items }
  let orderCopy = [...order]
  let changed = true

  while (changed) {
    changed = false
    for (const [id, it] of Object.entries({ ...itemsCopy })) {
      if (it.type !== 'group') continue
      const g = it as GroupViewItem

      if (g.children.length === 0) {
        delete itemsCopy[id]
        orderCopy = orderCopy.filter(o => o !== id)
        changed = true
        continue
      }

      if (g.children.length === 1) {
        const only = g.children[0]
        const idx = orderCopy.indexOf(id)
        if (idx !== -1) {
          orderCopy.splice(idx, 1, only)
        }
        delete itemsCopy[id]
        changed = true
        break
      }
    }
  }

  return { items: itemsCopy, order: orderCopy }
}

/* ----------------------- Color mapping ----------------------- */
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

      if (item.type === 'group') {
        // Group gets new color
        const groupColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
        colorMap.set(id, groupColor)
        // Recurse for children
        assignColorsToItems(item.children)
      } else if (item.type === 'user' || item.type === 'alias') {
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

/* ------------- Order helpers (for selection store) ------------- */
export function buildStructuralOrder(viewState: ViewState): string[] {
  const res: string[] = []
  const visit = (id: string) => {
    res.push(id)
    const it = viewState.items[id]
    if (!it) return
    if (it.type === 'group') {
      for (const c of (it as GroupViewItem).children) visit(c)
    }
  }
  for (const id of viewState.order) visit(id)
  return res
}

export function buildDisplayOrder(viewState: ViewState): string[] {
  const res: string[] = []
  const visit = (id: string) => {
    res.push(id)
    const it = viewState.items[id]
    if (!it) return
    if (it.type === 'group') {
      const collapsed = !!viewState.collapseMap[id]
      if (!collapsed) {
        for (const c of (it as GroupViewItem).children) visit(c)
      }
    }
  }
  for (const id of viewState.order) visit(id)
  return res
}
