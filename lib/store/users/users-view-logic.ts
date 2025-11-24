import type { LuminancePreset } from '@/lib/utils'
import { getCyclicColor } from '@/lib/utils'
import type { FUser } from '@/types'

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

export function isDescendant(
  items: Record<string, ViewItem>,
  parentId: string,
  candidateId: string
): boolean {
  const parent = items[parentId] as GroupViewItem | undefined
  if (!parent || parent.type !== 'group') return false

  for (const c of parent.children) {
    if (c === candidateId) return true
    if (items[c]?.type === 'group') {
      if (isDescendant(items, c, candidateId)) return true
    }
  }
  return false
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

/**
 * prune groups with <=1 child:
 * - If group has 0 child -> delete group
 * - If group has 1 child -> remove group and "extract" its only child:
 *   * if group is top-level => replace group in order by onlyChild
 *   * if group is inside parent => replace group's id in parent's children by onlyChild
 * This operation is applied repeatedly until no group has <=1 child.
 */
export function pruneGroups(items: Record<string, ViewItem>, order: string[]) {
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
        const parentId = findParent(itemsCopy, id)
        if (parentId) {
          const parent = itemsCopy[parentId] as GroupViewItem
          const idx = parent.children.indexOf(id)
          if (idx !== -1) {
            const newChildren = [
              ...parent.children.slice(0, idx),
              only,
              ...parent.children.slice(idx + 1),
            ]
            itemsCopy[parentId] = { ...parent, children: newChildren }
          }
        } else {
          const idx = orderCopy.indexOf(id)
          if (idx !== -1) {
            orderCopy.splice(idx, 1, only)
          }
        }
        delete itemsCopy[id]
        changed = true
        break
      }
    }
  }

  return { items: itemsCopy, order: orderCopy }
}

/* ------------------------- Color mapping ------------------------- */
export function buildColorMap(
  viewState: ViewState,
  usersById: Map<number, FUser>,
  baseColor: string = '#16A34A',
  count: number = 8,
  preset: LuminancePreset = 'shortlist'
): Map<string, string> {
  const colorMap = new Map<string, string>()
  let colorIndex = 0

  const assignColorsToItems = (itemIds: string[], parentColor?: string) => {
    for (const id of itemIds) {
      const item = viewState.items[id]
      if (!item) continue

      if (item.type === 'group') {
        // Group gets new color
        const groupColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
        colorMap.set(id, groupColor)
        // Assign colors to children with group's color as parentColor
        assignColorsToItems(item.children)
      } else if (item.type === 'user') {
        // If a previous alias already assigned a color to this user, reuse it.
        const numericKey = String(item.userId)
        const existingColor = colorMap.get(id) || colorMap.get(numericKey) || parentColor

        const userColor =
          existingColor ??
          // no existing color -> generate a new one
          getCyclicColor(baseColor, count, preset, ++colorIndex)

        colorMap.set(id, userColor) // keyed by view id (e.g. "u:1")
        colorMap.set(String(item.userId), userColor) // keyed by numeric id string (e.g. "1")
      } else if (item.type === 'alias') {
        // Alias should inherit the user's color if already set.
        // If not set (alias appears before user), we *assign a new color* and also set it for the user.
        const userViewId = makeUserViewId(item.userId)
        const numericKey = String(item.userId)

        const existingUserColor = colorMap.get(userViewId) || colorMap.get(numericKey)

        let userColor: string
        if (existingUserColor) {
          userColor = existingUserColor
        } else if (parentColor) {
          userColor = parentColor
          // also persist it under the user id so later user will reuse it
          colorMap.set(userViewId, userColor)
          colorMap.set(numericKey, userColor)
        } else {
          // alias before user and no parent color => generate a new color and assign it to the user too
          userColor = getCyclicColor(baseColor, count, preset, ++colorIndex)
          colorMap.set(userViewId, userColor)
          colorMap.set(numericKey, userColor)
        }

        colorMap.set(id, userColor) // alias key (e.g. "a:1:1")
      }
    }
  }

  assignColorsToItems(viewState.order)
  return colorMap
}

/* ------------------------- Order helpers (for selection store) ------------------------- */
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
