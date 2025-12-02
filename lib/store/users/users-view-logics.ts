/** @deprecated This file is a compatibility shim for backwards compatibility. **/

// Re-export types from central types file
export type { ViewItem, ViewState } from '@/types'

// Re-export utilities from service layer
export {

  // Color Service
  buildColorMap, buildDisplayOrder,
  // Order Service
  buildStructuralOrder,
  // View Utilities
  findParent,
  // Type Guards
  isGroup,
  isItem, killGroups, makeAliasViewId,
  makeGroupViewId,
  // ID Helpers
  makeUserViewId, removeIdFromAll,
  removeIds
} from '@/lib/utils/core-service'

