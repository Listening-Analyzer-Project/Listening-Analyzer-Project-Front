/**
 * Users Service Helpers
 * 
 * Core utility functions for working with users view data:
 * - ID generation
 * - Type guards
 * - View manipulation utilities
 */

import type { ViewItem } from '@/types'

/* ========================= ID HELPERS ========================= */

/**
 * Generate a view ID for a user
 * @param userId - The numeric user ID from the database
 * @returns A string ID in the format "u:{userId}"
 */
export const makeUserViewId = (userId: number): string => `u:${userId}`

/**
 * Generate a view ID for a user alias
 * @param userId - The numeric user ID that this alias references
 * @param localId - A local counter to make the alias ID unique
 * @returns A string ID in the format "a:{userId}:{localId}"
 */
export const makeAliasViewId = (userId: number, localId: number): string => 
  `a:${userId}:${localId}`

/**
 * Generate a view ID for a group
 * @param localId - A local counter to make the group ID unique
 * @returns A string ID in the format "g:{localId}"
 */
export const makeGroupViewId = (localId: number): string => `g:${localId}`

/* ========================= TYPE GUARDS ========================= */

/**
 * Type guard to check if a ViewItem is a group
 * Groups have a 'children' property with an array of member IDs
 */
export const isGroup = (
  item: ViewItem | undefined
): item is { id: string; children: string[]; name?: string } => {
  return !!item && 'children' in item
}

/**
 * Type guard to check if a ViewItem is a user or alias
 * User items have a 'userId' property
 */
export const isItem = (
  item: ViewItem | undefined
): item is { id: string; userId: number; isAlias?: boolean } => {
  return !!item && 'userId' in item
}

/* ========================= VIEW UTILITIES ========================= */

/**
 * Find the parent group of a given item
 * @param items - The items map from view state
 * @param targetId - The ID of the item to find the parent for
 * @returns The parent group ID, or null if the item is at root level
 */
export function findParent(
  items: Record<string, ViewItem>,
  targetId: string
): string | null {
  for (const [id, it] of Object.entries(items)) {
    if (isGroup(it) && it.children.includes(targetId)) {
      return id
    }
  }
  return null
}

/**
 * Remove an ID from all groups and the top-level order
 * Returns new items and order (immutable)
 * @param items - The items map from view state
 * @param order - The top-level order array
 * @param idToRemove - The ID to remove from all containers
 * @returns New items map and order array with the ID removed
 */
export function removeIdFromAll(
  items: Record<string, ViewItem>,
  order: string[],
  idToRemove: string
) {
  const itemsCopy: Record<string, ViewItem> = {}
  
  for (const [k, v] of Object.entries(items)) {
    if (isGroup(v)) {
      itemsCopy[k] = { ...v, children: v.children.filter(c => c !== idToRemove) }
    } else {
      itemsCopy[k] = v
    }
  }
  
  const orderCopy = order.filter(i => i !== idToRemove)
  return { items: itemsCopy, order: orderCopy }
}

/**
 * Remove multiple IDs from the view structure
 * Also deletes the items themselves from the items map
 * @param items - The items map from view state
 * @param order - The top-level order array
 * @param ids - Array of IDs to remove
 * @returns New items map and order array
 */
export function removeIds(
  items: Record<string, ViewItem>,
  order: string[],
  ids: string[]
) {
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
 * Kill groups with <=1 child
 * - If group has 0 children -> delete group
 * - If group has 1 child -> remove group and "extract" its only child
 * This operation is applied repeatedly until no group has <=1 child
 * 
 * @param items - The items map from view state
 * @param order - The top-level order array
 * @returns New items map and order array with empty/single-child groups removed
 */
export function killGroups(
  items: Record<string, ViewItem>,
  order: string[]
) {
  let itemsCopy = { ...items }
  let orderCopy = [...order]
  let changed = true

  while (changed) {
    changed = false
    
    for (const [id, it] of Object.entries({ ...itemsCopy })) {
      if (!isGroup(it)) continue

      if (it.children.length === 0) {
        delete itemsCopy[id]
        orderCopy = orderCopy.filter(o => o !== id)
        changed = true
        continue
      }

      if (it.children.length === 1) {
        const only = it.children[0]
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
