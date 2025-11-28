import type { FUser } from '@/types'
import type { SelectionState } from './users-selection-store'
import { syncSelectionWithView } from './users-selection-store'
import { isGroup, isItem, killGroups, makeUserViewId } from './users-view-logics'
import type { ViewState } from './users-view-store'

const STORAGE_VERSION = 1
const STORE_KEY = `users.viewState.v${STORAGE_VERSION}`

export type PersistedPayload = {
  viewState: ViewState
  selectionState: SelectionState
  meta?: { savedAt?: string }
}

export function loadPersistedPayload(): PersistedPayload | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedPayload
  } catch (e) {
    console.warn('loadPersistedPayload error', e)
    return null
  }
}

export function savePersistedPayload(payload: PersistedPayload): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.error('savePersistedPayload error', e)
  }
}

export function clearPersistedPayload(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORE_KEY)
  } catch (e) {}
}

/**
 * Reconcile stored viewState with authoritative users list.
 * Simplified to assume stored data matches current schema (or close enough).
 * Returns a clean ViewState.
 */
export function reconcileViewStateWithUsers(stored: ViewState | null, users: FUser[]): ViewState {
  const userViewIds = new Set(users.filter(u => u.id != null).map(u => makeUserViewId(u.id!)))
  if (!stored) {
    const items: Record<string, any> = {}
    const order: string[] = []
    let nextId = 1
    for (const u of users) {
      if (u.id == null) continue
      const id = makeUserViewId(u.id)
      items[id] = { id, userId: u.id }
      order.push(id)
    }
    return { items, order, nextId, collapseMap: {} }
  }

  const itemsCopy: Record<string, any> = {}
  

  for (const [id, it] of Object.entries(stored.items)) {
    if (isGroup(it)) {
      itemsCopy[id] = { ...it, children: [...it.children] }
    } else if (isItem(it)) {
      if (it.isAlias) {
         const userViewId = makeUserViewId(it.userId)
         if (userViewIds.has(userViewId)) {
           itemsCopy[id] = { ...it }
         }
      } else {
         if (userViewIds.has(id)) {
           itemsCopy[id] = { ...it }
         }
      }
    }
  }

  let orderCopy = (stored.order || []).filter(o => !!itemsCopy[o])

  for (const [id, it] of Object.entries(itemsCopy)) {
    if (isGroup(it)) {
      it.children = it.children.filter((c: string) => !!itemsCopy[c])
    }
  }

  const pruned = killGroups(itemsCopy, orderCopy)

  const itemsFinal = { ...pruned.items }
  const orderFinal = [...pruned.order]

  for (const u of users) {
    if (u.id == null) continue
    const uid = makeUserViewId(u.id)
    if (!itemsFinal[uid]) {
      itemsFinal[uid] = { id: uid, userId: u.id }
      orderFinal.push(uid)
    }
  }

  const nextId = Math.max(stored.nextId ?? 1, 1)
  return { items: itemsFinal, order: orderFinal, nextId, collapseMap: stored.collapseMap ?? {} }
}

/**
 * Utility: take a loaded persisted payload (possibly null), reconcile view with users,
 * then compute a cleaned selectionState (syncSelectionWithView) and return the full payload to restore.
 */
export function buildRestoredPayload(
  loaded: PersistedPayload | null,
  users: FUser[]
): PersistedPayload {
  const storedView = loaded?.viewState ?? null
  const reconciledView = reconcileViewStateWithUsers(storedView, users)

  // determine selectionState: if stored selection exists, filter & reorder it
  const storedSelection = loaded?.selectionState ?? { selectedIds: [] }
  const cleanedSelection = syncSelectionWithView(reconciledView, storedSelection, false) // use structural order
  return {
    viewState: reconciledView,
    selectionState: cleanedSelection,
    meta: { savedAt: new Date().toISOString() },
  }
}
