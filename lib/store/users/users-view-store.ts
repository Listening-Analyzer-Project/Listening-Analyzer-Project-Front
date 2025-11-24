import type { FUser } from '@/types'
import {
  type AliasViewItem,
  type GroupViewItem,
  type ViewItem,
  type ViewState,
  isDescendant,
  makeAliasViewId,
  makeGroupViewId,
  makeUserViewId,
  pruneGroups,
  removeIdFromAll,
  removeIds
} from './users-view-logic'

/* ------------------------- Re-exports ------------------------- */
export type {
  AliasViewItem,
  GroupViewItem,
  UserViewItem,
  ViewItem,
  ViewItemType,
  ViewState
} from './users-view-logic'

export {
  buildColorMap,
  buildDisplayOrder,
  buildStructuralOrder,
  makeUserViewId,
  pruneGroups
} from './users-view-logic'

/* ------------------------- Actions ------------------------- */
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
  | { type: 'RESTORE_VIEWSTATE'; payload: { viewState: ViewState } }

/* ------------------------- Reducer ------------------------- */
export const initialViewState: ViewState = {
  items: {},
  order: [],
  nextId: 1,
  collapseMap: {},
}

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
      return { ...state, order: action.payload.newOrder }
    }

    case 'CREATE_ALIAS': {
      const { userId, index } = action.payload
      const local = state.nextId
      const id = makeAliasViewId(userId, local)
      const alias: AliasViewItem = { id, type: 'alias', userId }

      let order = [...state.order]
      const pos = index ?? order.length
      order.splice(pos, 0, id)

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
            if (g.children.includes(m)) {
              itemsCopy[pid] = { ...g, children: g.children.filter(c => c !== m) }
            }
          }
        }
      }

      let groupName = name
      if (!groupName) {
        const usedNumbers = new Set<number>()
        for (const it of Object.values(state.items)) {
          if (it.type === 'group' && it.name) {
            const match = it.name.match(/^Group (\d+)$/)
            if (match) {
              usedNumbers.add(parseInt(match[1], 10))
            }
          }
        }
        let nextNum = 1
        while (usedNumbers.has(nextNum)) {
          nextNum++
        }
        groupName = `Group ${nextNum}`
      }

      const group: GroupViewItem = {
        id: gid,
        type: 'group',
        children: [...memberIds],
        name: groupName,
      }
      itemsCopy = { ...itemsCopy, [gid]: group }

      const pos = index ?? orderCopy.length
      orderCopy.splice(pos, 0, gid)

      return {
        ...state,
        items: itemsCopy,
        order: orderCopy,
        nextId: local + 1,
      }
    }

    case 'ADD_CHILD_TO_GROUP': {
      const { groupId, childId, index } = action.payload
      const group = state.items[groupId] as GroupViewItem | undefined
      if (!group || group.type !== 'group') return state

      if (state.items[childId]?.type === 'group' && isDescendant(state.items, childId, groupId)) {
        console.warn('Refuse ADD_CHILD_TO_GROUP: would create cycle', childId, groupId)
        return state
      }

      const removed = removeIdFromAll(state.items, state.order, childId)
      const tgt = removed.items[groupId] as GroupViewItem | undefined
      if (!tgt || tgt.type !== 'group') return state

      const newChildren = [...tgt.children]
      const pos = index ?? newChildren.length
      newChildren.splice(pos, 0, childId)
      removed.items[groupId] = { ...tgt, children: newChildren }

      return {
        ...state,
        items: removed.items,
        order: removed.order,
      }
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

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: pruned.items,
        order: pruned.order,
        collapseMap,
      }
    }

    case 'DELETE_ALIAS': {
      const { id } = action.payload
      const removed = removeIds(state.items, state.order, [id])
      const pruned = pruneGroups(removed.items, removed.order)

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: pruned.items,
        order: pruned.order,
        collapseMap,
      }
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

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (pruned.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: pruned.items,
        order: pruned.order,
        collapseMap,
      }
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
      return {
        ...state,
        collapseMap: {
          ...state.collapseMap,
          [id]: !state.collapseMap[id],
        },
      }
    }

    case 'RESTORE_VIEWSTATE': {
      return action.payload.viewState
    }

    default:
      return state
  }
}

/* ------------------------- Action creators (helpers) ------------------------- */
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
