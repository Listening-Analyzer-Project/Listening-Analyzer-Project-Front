// lib/store/users/users-view-store.ts
import { getCyclicColor } from '@/lib/utils'
import type { LuminancePreset } from '@/lib/utils/colors'
import type { FUser } from '@/types'

/* -------------------------
   Types
   ------------------------- */

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

/* -------------------------
   Actions
   ------------------------- */

export type ViewAction =
  | { type: 'INIT_FROM_USERS'; payload: FUser[] }
  | { type: 'REORDER'; payload: { newOrder: string[] } }
  | { type: 'CREATE_ALIAS'; payload: { userId: number; index?: number } }
  | { type: 'CREATE_GROUP'; payload: { memberIds: string[]; index?: number; name?: string } }
  | { type: 'ADD_CHILD_TO_GROUP'; payload: { groupId: string; childId: string; index?: number } }
  | { type: 'DELETE_USER'; payload: { userId: number } }
  | { type: 'DELETE_ALIAS'; payload: { id: string } }
  | { type: 'DELETE_GROUP'; payload: { id: string } }
  | { type: 'RENAME_GROUP'; payload: { id: string; name: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { id: string } }
  // NEW: restore entire view state from persisted payload
  | { type: 'RESTORE_VIEWSTATE'; payload: { viewState: ViewState } }

/* -------------------------
   Id helpers
   ------------------------- */

export const makeUserViewId = (userId: number) => `u:${userId}`
const makeAliasViewId = (userId: number, localId: number) => `a:${userId}:${localId}`
const makeGroupViewId = (localId: number) => `g:${localId}`

/* -------------------------
   Pure helpers
   ------------------------- */

function findParent(items: Record<string, ViewItem>, targetId: string): string | null {
  for (const [id, it] of Object.entries(items)) {
    if (it.type === 'group' && (it as GroupViewItem).children.includes(targetId)) return id
  }
  return null
}

function isDescendant(
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

function removeIdFromAll(items: Record<string, ViewItem>, order: string[], idToRemove: string) {
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

function removeIds(items: Record<string, ViewItem>, order: string[], ids: string[]) {
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

/** prune groups with <=1 child:
  - If group has 0 child -> delete group
  - If group has 1 child -> remove group and "extract" its only child:
      * if group is top-level => replace group in order by onlyChild
      * if group is inside parent => replace group's id in parent's children by onlyChild
  This operation is applied repeatedly until no group has <=1 child.
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

export function enforceAliasBelowParent(
  items: Record<string, ViewItem>,
  order: string[]
): string[] {
  const orderCopy = [...order]

  const indexMap: Record<string, number> = {}
  orderCopy.forEach((id, idx) => (indexMap[id] = idx))

  let changed = true
  while (changed) {
    changed = false
    for (const id of orderCopy) {
      const item = items[id]
      if (item?.type === 'alias') {
        const userId = item.userId
        const userViewId = makeUserViewId(userId)
        const aliasIdx = indexMap[id]
        const userIdx = indexMap[userViewId]
        if (userIdx === undefined) continue
        if (aliasIdx < userIdx) {
          orderCopy.splice(aliasIdx, 1)
          const newUserIdx = indexMap[userViewId]
          orderCopy.splice(newUserIdx + 1, 0, id)
          orderCopy.forEach((id, idx) => (indexMap[id] = idx))
          changed = true
          break
        }
      }
    }
  }

  return orderCopy
}

/* -------------------------
   Color mapping
   ------------------------- */

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
        assignColorsToItems(item.children, groupColor)
      } else if (item.type === 'user') {
        // User gets new color unless parent provides one
        const userColor = parentColor || getCyclicColor(baseColor, count, preset, ++colorIndex)
        colorMap.set(id, userColor) // keyed by view id (e.g. "u:1")
        colorMap.set(String(item.userId), userColor) // keyed by numeric id string (e.g. "1")
      } else if (item.type === 'alias') {
        // Alias gets same color as original user (or parent fallback)
        const userViewId = makeUserViewId(item.userId)
        const userColor = colorMap.get(userViewId) || parentColor || '#64748b'
        colorMap.set(id, userColor) // alias key (e.g. "a:1:1")
        // ensure numeric user key also exists (useful for AvatarStack)
        colorMap.set(String(item.userId), userColor)
      }
    }
  }

  assignColorsToItems(viewState.order)
  return colorMap
}

/* -------------------------
   Order helpers (for selection store)
   ------------------------- */

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

/* -------------------------
   Reducer
   ------------------------- */

export const initialViewState: ViewState = { items: {}, order: [], nextId: 1, collapseMap: {} }

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'INIT_FROM_USERS': {
      const items: Record<string, ViewItem> = {}
      const order: string[] = []
      for (const u of action.payload) {
        if (u.id === undefined || u.id === null) continue
        const userId: number = u.id
        const id = makeUserViewId(userId)
        items[id] = { id, type: 'user', userId }
        order.push(id)
      }
      return { ...state, items, order }
    }

    case 'REORDER': {
      // enforce alias always below parent
      const newOrder = enforceAliasBelowParent(state.items, action.payload.newOrder)
      return { ...state, order: newOrder }
    }

    case 'CREATE_ALIAS': {
      const { userId, index } = action.payload
      const local = state.nextId
      const id = makeAliasViewId(userId, local)
      const alias: AliasViewItem = { id, type: 'alias', userId }

      let order = [...state.order]
      const pos = index ?? order.length
      order.splice(pos, 0, id)

      // enforce alias below parent
      order = enforceAliasBelowParent(state.items, order)

      return {
        ...state,
        items: { ...state.items, [id]: alias },
        order,
        nextId: local + 1,
      }
    }

    case 'CREATE_GROUP': {
      const { memberIds, index, name } = action.payload
      for (const a of memberIds) {
        for (const b of memberIds) {
          if (a !== b && state.items[a]?.type === 'group' && isDescendant(state.items, a, b)) {
            console.warn('Refuse CREATE_GROUP: would create cycle between', a, b)
            return state
          }
        }
      }

      const local = state.nextId
      const gid = makeGroupViewId(local)
      let itemsCopy = { ...state.items }
      let orderCopy = [...state.order]

      for (const m of memberIds) {
        orderCopy = orderCopy.filter(o => o !== m)
        for (const [pid, it] of Object.entries(itemsCopy)) {
          if (it.type === 'group') {
            const g = it as GroupViewItem
            if (g.children.includes(m))
              itemsCopy[pid] = { ...g, children: g.children.filter(c => c !== m) }
          }
        }
      }

      const group: GroupViewItem = {
        id: gid,
        type: 'group',
        children: [...memberIds],
        name: name ?? `Group ${local}`,
      }
      itemsCopy = { ...itemsCopy, [gid]: group }
      const pos = index ?? orderCopy.length
      orderCopy.splice(pos, 0, gid)

      // enforce alias below parent
      orderCopy = enforceAliasBelowParent(itemsCopy, orderCopy)

      return { ...state, items: itemsCopy, order: orderCopy, nextId: local + 1 }
    }

    case 'ADD_CHILD_TO_GROUP': {
      const { groupId, childId, index } = action.payload
      const group = state.items[groupId] as GroupViewItem | undefined
      if (!group || group.type !== 'group') return state
      if (state.items[childId]?.type === 'group' && isDescendant(state.items, childId, groupId)) {
        console.warn('Refuse ADD_CHILD_TO_GROUP: would create cycle', childId, groupId)
        return state
      }

      const removed = removeIds(state.items, state.order, [childId])
      const tgt = removed.items[groupId] as GroupViewItem | undefined
      if (!tgt || tgt.type !== 'group') return state

      const newChildren = [...tgt.children]
      const pos = index ?? newChildren.length
      newChildren.splice(pos, 0, childId)
      removed.items[groupId] = { ...tgt, children: newChildren }

      // enforce alias below parent
      const newOrder = enforceAliasBelowParent(removed.items, removed.order)
      return { ...state, items: removed.items, order: newOrder }
    }

    case 'DELETE_USER': {
      const { userId } = action.payload
      const userViewId = makeUserViewId(userId)
      const aliasIds = Object.keys(state.items).filter(
        k => state.items[k].type === 'alias' && (state.items[k] as AliasViewItem).userId === userId
      )
      const idsToRemove = [userViewId, ...aliasIds]
      const removed = removeIds(state.items, state.order, idsToRemove)
      const pruned = pruneGroups(removed.items, removed.order)

      const prunedOrder = enforceAliasBelowParent(pruned.items, pruned.order)
      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap))
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]

      return { ...state, items: pruned.items, order: prunedOrder, collapseMap }
    }

    case 'DELETE_ALIAS': {
      const { id } = action.payload
      const removed = removeIds(state.items, state.order, [id])
      const pruned = pruneGroups(removed.items, removed.order)

      const prunedOrder = enforceAliasBelowParent(pruned.items, pruned.order)
      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap))
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]

      return { ...state, items: pruned.items, order: prunedOrder, collapseMap }
    }

    case 'DELETE_GROUP': {
      const { id } = action.payload
      const group = state.items[id] as GroupViewItem | undefined
      if (!group || group.type !== 'group') return state

      let itemsCopy = { ...state.items }
      const groupChildren = [...group.children] // Save children before deletion

      // Delete the group
      delete itemsCopy[id]

      // Replace group with its children in parent groups
      for (const [pid, it] of Object.entries(itemsCopy)) {
        if (it.type === 'group') {
          const g = it as GroupViewItem
          const idx = g.children.indexOf(id)
          if (idx !== -1) {
            itemsCopy[pid] = {
              ...g,
              children: [
                ...g.children.slice(0, idx),
                ...groupChildren,
                ...g.children.slice(idx + 1),
              ],
            }
          }
        }
      }

      // Replace group with its children in top-level order
      const orderCopy = [...state.order]
      const idx = orderCopy.indexOf(id)
      if (idx !== -1) {
        orderCopy.splice(idx, 1, ...groupChildren)
      }

      const pruned = pruneGroups(itemsCopy, orderCopy)
      const prunedOrder = enforceAliasBelowParent(pruned.items, pruned.order)
      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap))
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]

      return { ...state, items: pruned.items, order: prunedOrder, collapseMap }
    }

    case 'RENAME_GROUP': {
      const { id, name } = action.payload
      const it = state.items[id]
      if (!it || it.type !== 'group') return state
      const copy = { ...state.items, [id]: { ...(it as GroupViewItem), name } }
      return { ...state, items: copy }
    }

    case 'TOGGLE_COLLAPSE': {
      const { id } = action.payload
      return { ...state, collapseMap: { ...state.collapseMap, [id]: !state.collapseMap[id] } }
    }

    case 'RESTORE_VIEWSTATE': {
      return action.payload.viewState
    }

    default:
      return state
  }
}

/* -------------------------
   Action creators (helpers)
   ------------------------- */

export const viewActions = {
  initFromUsers: (users: FUser[]) => ({ type: 'INIT_FROM_USERS' as const, payload: users }),
  reorder: (newOrder: string[]) => ({ type: 'REORDER' as const, payload: { newOrder } }),
  createAlias: (userId: number, index?: number) => ({
    type: 'CREATE_ALIAS' as const,
    payload: { userId, index },
  }),
  createGroup: (memberIds: string[], index?: number, name?: string) => ({
    type: 'CREATE_GROUP' as const,
    payload: { memberIds, index, name },
  }),
  addChildToGroup: (groupId: string, childId: string, index?: number) => ({
    type: 'ADD_CHILD_TO_GROUP' as const,
    payload: { groupId, childId, index },
  }),
  deleteUser: (userId: number) => ({ type: 'DELETE_USER' as const, payload: { userId } }),
  deleteAlias: (id: string) => ({ type: 'DELETE_ALIAS' as const, payload: { id } }),
  deleteGroup: (id: string) => ({ type: 'DELETE_GROUP' as const, payload: { id } }),
  renameGroup: (id: string, name: string) => ({
    type: 'RENAME_GROUP' as const,
    payload: { id, name },
  }),
  toggleCollapse: (id: string) => ({ type: 'TOGGLE_COLLAPSE' as const, payload: { id } }),
  restoreViewState: (viewState: ViewState) => ({
    type: 'RESTORE_VIEWSTATE' as const,
    payload: { viewState },
  }),
}
