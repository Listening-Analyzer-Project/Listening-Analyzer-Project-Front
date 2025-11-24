import type { FUser } from '@/types'
import {
  type AliasViewItem,
  type GroupViewItem,
  type ViewItem,
  type ViewState,
  killGroups,
  makeAliasViewId,
  makeGroupViewId,
  makeUserViewId,
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
  buildStructuralOrder, killGroups, makeUserViewId
} from './users-view-logic'

/* ------------------------- Actions ------------------------- */
export type ViewAction =
  | { type: 'INIT_FROM_USERS'; payload: FUser[] }
  | { type: 'REORDER'; payload: { newOrder: string[] } }
  | { type: 'CREATE_ALIAS'; payload: { userId: number; index?: number } }
  | { type: 'CREATE_GROUP'; payload: { memberIds: string[]; index?: number; name?: string } }
  | { type: 'REMOVE_CHILDREN_FROM_GROUP'; payload: { childIds: string[] } }
  | { type: 'ADD_CHILDREN_TO_GROUP'; payload: { groupId: string; childIds: string[]; index?: number } }
  | { type: 'MERGE_GROUPS'; payload: { targetGroupId: string; sourceGroupIds: string[] } }
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

      for (const m of memberIds) {
        if (state.items[m]?.type === 'group') {
          console.warn('Refuse CREATE_GROUP: cannot create group containing another group', m)
          return state
        }
      }

      const local = state.nextId
      const gid = makeGroupViewId(local)
      let itemsCopy = { ...state.items }
      let orderCopy = [...state.order]

      // Remove members from their current groups and top-level order
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

      // Kill groups BEFORE creating the new group (for proper numbering)
      const killed = killGroups(itemsCopy, orderCopy)
      itemsCopy = killed.items
      orderCopy = killed.order

      // NOW determine the group name (after groups have been killed)
      let groupName = name
      if (!groupName) {
        const usedNumbers = new Set<number>()
        for (const it of Object.values(itemsCopy)) {
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

    case 'REMOVE_CHILDREN_FROM_GROUP': {
      const { childIds } = action.payload
      
      // Find the parent group (assumes all children are in the same group)
      let parentGroupId: string | null = null
      for (const [pid, it] of Object.entries(state.items)) {
        if (it.type === 'group') {
          const g = it as GroupViewItem
          if (childIds.some(cid => g.children.includes(cid))) {
            parentGroupId = pid
            break
          }
        }
      }
      
      // Remove children from all groups
      let itemsCopy = state.items
      for (const cid of childIds) {
        for (const [pid, it] of Object.entries(itemsCopy)) {
          if (it.type === 'group') {
            const g = it as GroupViewItem
            if (g.children.includes(cid)) {
              itemsCopy = { ...itemsCopy, [pid]: { ...g, children: g.children.filter(c => c !== cid) } }
            }
          }
        }
      }
      
      // Remove from top-level order (in case they were there)
      let orderCopy = state.order.filter(id => !childIds.includes(id))
      
      // Insert children right after their parent group
      if (parentGroupId) {
        const parentIndex = orderCopy.indexOf(parentGroupId)
        if (parentIndex !== -1) {
          orderCopy.splice(parentIndex + 1, 0, ...childIds)
        } else {
          // Parent not in top-level, add to end
          orderCopy.push(...childIds)
        }
      } else {
        // No parent found, add to end
        orderCopy.push(...childIds)
      }
      
      // Kill groups that became empty or single-child
      const killed = killGroups(itemsCopy, orderCopy)
      
      return {
        ...state,
        items: killed.items,
        order: killed.order,
      }
    }

    case 'ADD_CHILDREN_TO_GROUP': {
      const { groupId, childIds, index } = action.payload
      const group = state.items[groupId] as GroupViewItem | undefined
      if (!group || group.type !== 'group') return state

      // Validate no groups in childIds
      for (const cid of childIds) {
        if (state.items[cid]?.type === 'group') {
          console.warn('Refuse ADD_CHILDREN_TO_GROUP: cannot add a group into another group', cid)
          return state
        }
      }

      // Remove children from their current positions WITHOUT deleting them
      let itemsCopy = state.items
      let orderCopy = state.order
      for (const cid of childIds) {
        const removed = removeIdFromAll(itemsCopy, orderCopy, cid)
        itemsCopy = removed.items
        orderCopy = removed.order
      }

      const tgt = itemsCopy[groupId] as GroupViewItem | undefined
      if (!tgt || tgt.type !== 'group') return state

      const newChildren = [...tgt.children]
      const pos = index ?? newChildren.length
      newChildren.splice(pos, 0, ...childIds)
      
      itemsCopy = { ...itemsCopy, [groupId]: { ...tgt, children: newChildren } }

      // Kill groups that might have become empty after removing children
      const killed = killGroups(itemsCopy, orderCopy)

      return {
        ...state,
        items: killed.items,
        order: killed.order,
      }
    }

    case 'MERGE_GROUPS': {
      const { targetGroupId, sourceGroupIds } = action.payload
      const targetGroup = state.items[targetGroupId] as GroupViewItem | undefined
      if (!targetGroup || targetGroup.type !== 'group') return state

      let itemsCopy = { ...state.items }
      let orderCopy = [...state.order]
      let newChildren = [...targetGroup.children]

      for (const srcId of sourceGroupIds) {
        const srcGroup = itemsCopy[srcId] as GroupViewItem | undefined
        if (!srcGroup || srcGroup.type !== 'group') continue
        if (srcId === targetGroupId) continue

        newChildren.push(...srcGroup.children)
        delete itemsCopy[srcId]
        orderCopy = orderCopy.filter(id => id !== srcId)
      }

      itemsCopy[targetGroupId] = { ...targetGroup, children: newChildren }

      // Kill any groups that might have become empty
      const killed = killGroups(itemsCopy, orderCopy)

      return {
        ...state,
        items: killed.items,
        order: killed.order,
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
      const killed = killGroups(removed.items, removed.order)

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (killed.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: killed.items,
        order: killed.order,
        collapseMap,
      }
    }

    case 'DELETE_ALIAS': {
      const { id } = action.payload
      const removed = removeIds(state.items, state.order, [id])
      const killed = killGroups(removed.items, removed.order)

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (killed.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: killed.items,
        order: killed.order,
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

      // Replace group with its children in top-level order
      const orderCopy = [...state.order]
      const idx = orderCopy.indexOf(id)
      if (idx !== -1) {
        orderCopy.splice(idx, 1, ...groupChildren)
      }

      const killed = killGroups(itemsCopy, orderCopy)

      const collapseMap: Record<string, boolean> = {}
      for (const k of Object.keys(state.collapseMap)) {
        if (killed.items[k]) collapseMap[k] = state.collapseMap[k]
      }

      return {
        ...state,
        items: killed.items,
        order: killed.order,
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
  removeChildrenFromGroup: (childIds: string[]) => ({
    type: 'REMOVE_CHILDREN_FROM_GROUP' as const,
    payload: { childIds },
  }),
  addChildrenToGroup: (groupId: string, childIds: string[], index?: number) => ({
    type: 'ADD_CHILDREN_TO_GROUP' as const,
    payload: { groupId, childIds, index },
  }),
  mergeGroups: (targetGroupId: string, sourceGroupIds: string[]) => ({
    type: 'MERGE_GROUPS' as const,
    payload: { targetGroupId, sourceGroupIds },
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
