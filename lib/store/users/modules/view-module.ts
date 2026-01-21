import { StateCreator } from 'zustand'

import { showErrorToast } from '@/lib/utils'
import {
    isGroup,
    isItem,
    killGroups,
    makeAliasViewId,
    makeGroupViewId,
    makeUserViewId,
    removeIdFromAll,
    removeIds
} from '@/lib/utils/core-service'
import type { UsersStore, ViewItem, ViewModule, ViewState } from '@/types/users-store-types'

const initialViewState: ViewState = {
    items: {},
    order: [],
    nextId: 1,
    collapseMap: {},
}

export const createViewModule: StateCreator<
    UsersStore,
    [["zustand/immer", never]],
    [],
    ViewModule
> = (set, get) => ({
    viewState: initialViewState,

    initFromUsers: (users) => {
        set((state) => {
            const items: Record<string, ViewItem> = {}
            const order: string[] = []
            for (const u of users) {
                if (u.id === undefined || u.id === null) continue
                const userId: number = u.id
                const id = makeUserViewId(userId)
                items[id] = { id, userId }
                order.push(id)
            }
            state.viewState = { ...initialViewState, items, order }
        })
    },

    reconcile: (users) => {
        set((state) => {
            const userViewIds = new Set(users.filter(u => u.id != null).map(u => makeUserViewId(u.id!)))
            const stored = state.viewState
            
            // 1. Clean items that no longer exist or are invalid
            const itemsCopy: Record<string, any> = {}
            for (const [id, it] of Object.entries(stored.items)) {
                const item = it as ViewItem
                if (isGroup(item)) {
                    // Keep groups for now, we'll filter their children
                    itemsCopy[id] = { ...item, children: [...item.children] }
                } else if (isItem(item)) {
                    if (item.isAlias) {
                        // Keep alias if user still exists
                        const userViewId = makeUserViewId(item.userId)
                        if (userViewIds.has(userViewId)) {
                            itemsCopy[id] = { ...item }
                        }
                    } else {
                        // Keep normal user item if it exists in new list
                        if (userViewIds.has(id)) {
                            itemsCopy[id] = { ...item }
                        }
                    }
                }
            }

            // 2. Filter children of groups
            for (const [id, it] of Object.entries(itemsCopy)) {
                if (isGroup(it)) {
                    // Only keep children that still exist in itemsCopy
                    it.children = it.children.filter((c: string) => !!itemsCopy[c])
                }
            }

            // 3. Filter top-level order
            const orderCopy = (stored.order || []).filter((o: string) => !!itemsCopy[o])

            // 4. Kill empty/invalid groups
            const pruned = killGroups(itemsCopy, orderCopy)

            const itemsFinal = { ...pruned.items }
            const orderFinal = [...pruned.order]

            // 5. Add new users
            for (const u of users) {
                if (u.id == null) continue
                const uid = makeUserViewId(u.id)
                if (!itemsFinal[uid]) {
                    itemsFinal[uid] = { id: uid, userId: u.id }
                    orderFinal.push(uid)
                }
            }

            const nextId = Math.max(stored.nextId ?? 1, 1)

            state.viewState = {
                items: itemsFinal,
                order: orderFinal,
                nextId,
                collapseMap: stored.collapseMap ?? {}
            }
        })
        
        // Auto-sync selection after reconcile
        // Accessing the store via get() allows calling actions from other slices
        get().syncSelection(false)
    },

    reorder: (newOrder) => {
        set((state) => {
            state.viewState.order = newOrder
        })
    },

    createAlias: (userId, index) => {
        set((state) => {
            const local = state.viewState.nextId
            const id = makeAliasViewId(userId, local)
            const alias: ViewItem = { id, userId, isAlias: true }

            const order = state.viewState.order
            const pos = index ?? order.length
            order.splice(pos, 0, id)

            state.viewState.items[id] = alias
            state.viewState.nextId = local + 1
        })
    },

    createGroup: (memberIds, index, name) => {
        set((state) => {
            // Check for nested groups
            for (const m of memberIds) {
                const item = state.viewState.items[m] as ViewItem | undefined
                if (isGroup(item)) {
                    showErrorToast('Refuse CREATE_GROUP: cannot create group containing another group', m)
                    return
                }
            }

            const local = state.viewState.nextId
            const gid = makeGroupViewId(local)
            
            // Remove members from their current positions
            let items = state.viewState.items
            let order = state.viewState.order

            // Remove members from their current groups and top-level order
            order = order.filter((o: string) => !memberIds.includes(o))
            for (const [pid, val] of Object.entries(items)) {
                const it = val as ViewItem
                if (isGroup(it)) {
                    if (memberIds.some(m => it.children.includes(m))) {
                            it.children = it.children.filter((c: string) => !memberIds.includes(c))
                    }
                }
            }

            // Kill groups
            const killed = killGroups(items, order)
            items = killed.items
            order = killed.order

            // Determine Name
            let groupName = name
            if (!groupName) {
                const usedNumbers = new Set<number>()
                for (const val of Object.values(items)) {
                    const it = val as ViewItem
                    if (isGroup(it) && it.name) {
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

            const group: ViewItem = {
                id: gid,
                children: [...memberIds],
                name: groupName,
            }
            
            items[gid] = group
            
            const pos = index ?? order.length
            order.splice(pos, 0, gid)

            state.viewState.items = items
            state.viewState.order = order
            state.viewState.nextId = local + 1
        })
    },

    addChildrenToGroup: (groupId, childIds, index) => {
        set((state) => {
            const group = state.viewState.items[groupId]
            if (!isGroup(group)) return

            // Validate
            for (const cid of childIds) {
                const item = state.viewState.items[cid] as ViewItem | undefined
                if (isGroup(item)) {
                        showErrorToast('Refuse ADD_CHILDREN_TO_GROUP: cannot add a group into another group', cid)
                        return
                }
            }

            // Remove from existing
            let { items, order } = state.viewState
            for (const cid of childIds) {
                const removed = removeIdFromAll(items, order, cid)
                items = removed.items
                order = removed.order
            }
            
            // Add to target
            const tgt = items[groupId]
            if (!isGroup(tgt)) return // Should not happen

            const newChildren = [...tgt.children]
            const pos = index ?? newChildren.length
            newChildren.splice(pos, 0, ...childIds)
            tgt.children = newChildren

            // Kill empty groups
            const killed = killGroups(items, order)
            
            state.viewState.items = killed.items
            state.viewState.order = killed.order
        })
    },

    removeChildrenFromGroup: (childIds) => {
        set((state) => {
            let parentGroupId: string | null = null
                for (const [pid, val] of Object.entries(state.viewState.items)) {
                const it = val as ViewItem
                if (isGroup(it)) {
                    if (childIds.some(cid => it.children.includes(cid))) {
                        parentGroupId = pid
                        break
                    }
                }
            }

            // Remove from items
            const items = state.viewState.items
            for (const [pid, val] of Object.entries(items)) {
                const it = val as ViewItem
                if (isGroup(it)) {
                    it.children = it.children.filter((c: string) => !childIds.includes(c))
                }
            }

            // Insert at top level
            let order = state.viewState.order.filter((id: string) => !childIds.includes(id)) // Should be clean but safe
            
                if (parentGroupId) {
                const parentIndex = order.indexOf(parentGroupId)
                if (parentIndex !== -1) {
                    order.splice(parentIndex + 1, 0, ...childIds)
                } else {
                    order.push(...childIds)
                }
            } else {
                order.push(...childIds)
            }

            const killed = killGroups(items, order)
            state.viewState.items = killed.items
            state.viewState.order = killed.order
        })
    },

    mergeGroups: (targetGroupId, sourceGroupIds) => {
        set((state) => {
            const targetGroup = state.viewState.items[targetGroupId]
            if (!isGroup(targetGroup)) return

            let items = state.viewState.items
            let order = state.viewState.order
            
            for (const srcId of sourceGroupIds) {
                const srcGroup = items[srcId]
                if (!isGroup(srcGroup)) continue
                if (srcId === targetGroupId) continue
                
                targetGroup.children.push(...srcGroup.children)
                delete items[srcId]
                order = order.filter((id: string) => id !== srcId)
            }

            const killed = killGroups(items, order)
            state.viewState.items = killed.items
            state.viewState.order = killed.order
        })
    },

    deleteUser: (userId) => {
        set((state) => {
            const userViewId = makeUserViewId(userId)
            const aliasIds = Object.keys(state.viewState.items).filter(k => {
                const it = state.viewState.items[k]
                return isItem(it) && it.isAlias && it.userId === userId
            })
            const idsToRemove = [userViewId, ...aliasIds]
            
            const removed = removeIds(state.viewState.items, state.viewState.order, idsToRemove)
            const killed = killGroups(removed.items, removed.order)
            
            // Clean collapse map
            const collapseMap: Record<string, boolean> = {}
            for (const k of Object.keys(state.viewState.collapseMap)) {
                if (killed.items[k]) collapseMap[k] = state.viewState.collapseMap[k]
            }

            state.viewState.items = killed.items
            state.viewState.order = killed.order
            state.viewState.collapseMap = collapseMap
            
            // Clean selection - CROSS SLICE MODIFICATION
            state.selectionState.selectedIds = state.selectionState.selectedIds.filter((id: string) => !idsToRemove.includes(id))
        })
    },

    deleteAlias: (id) => {
        set((state) => {
            const removed = removeIds(state.viewState.items, state.viewState.order, [id])
            const killed = killGroups(removed.items, removed.order)
            
            const collapseMap: Record<string, boolean> = {}
            for (const k of Object.keys(state.viewState.collapseMap)) {
                if (killed.items[k]) collapseMap[k] = state.viewState.collapseMap[k]
            }

            state.viewState.items = killed.items
            state.viewState.order = killed.order
            state.viewState.collapseMap = collapseMap
            // Clean selection - CROSS SLICE MODIFICATION
            state.selectionState.selectedIds = state.selectionState.selectedIds.filter((sel: string) => sel !== id)
        })
    },
    
    deleteGroup: (id) => {
        set((state) => {
            const group = state.viewState.items[id]
            if (!isGroup(group)) return

            let items = state.viewState.items
            const children = [...group.children]
            
            delete items[id]
            
            let order = [...state.viewState.order]
            const idx = order.indexOf(id)
            if (idx !== -1) {
                order.splice(idx, 1, ...children)
            }
            
            const killed = killGroups(items, order)
            
            const collapseMap: Record<string, boolean> = {}
            for (const k of Object.keys(state.viewState.collapseMap)) {
                if (killed.items[k]) collapseMap[k] = state.viewState.collapseMap[k]
            }
            
            state.viewState.items = killed.items
            state.viewState.order = killed.order
            state.viewState.collapseMap = collapseMap
            // Clean selection - CROSS SLICE MODIFICATION
            state.selectionState.selectedIds = state.selectionState.selectedIds.filter((sel: string) => sel !== id)
        })
    },

    renameGroup: (id, name) => {
        set((state) => {
            const it = state.viewState.items[id]
            if (isGroup(it)) {
                it.name = name
            }
        })
    },

    toggleCollapse: (id) => {
        set((state) => {
            state.viewState.collapseMap[id] = !state.viewState.collapseMap[id]
        })
    },
})
