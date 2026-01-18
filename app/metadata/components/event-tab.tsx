'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { userEndpoint } from '@/lib/api'
import { categoryEndpoint } from '@/lib/api/core/category-endpoint'
import { eventEndpoint } from '@/lib/api/core/event-endpoint'
import { useApi } from '@/lib/hooks'
import { useUsersViewStore } from '@/lib/store'
import { buildUserColorMap, makeUserViewId } from '@/lib/utils/core-service'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'
import { FCategory, FEventWithCategory, FUser } from '@/types'
import CategoryEventList from './event/category-event-list'
import EventDialog from './event/event-dialog'

const BASE_COLOR_HEX = '#16A34A' as const
const EQU_DIST_COUNT = 8 as const
const LUMINANCE_PRESET = 'shortList' as const

export default function EventTab() {
  const { selectionState, viewState } = useUsersViewStore()
  const [userIds, setUserIds] = useState<string[]>([])

  // Fetch Categories
  const { data: categoriesRaw, refetch: refetchCategories } = useApi<FCategory[]>(
    () => categoryEndpoint.fetchAll(),
    []
  )

  // Fetch Events
  const { data: eventsRaw, loading: loadingEvents, refetch: refetchEvents } = useApi<FEventWithCategory[]>(
    () => eventEndpoint.fetchAllWithCategory({ user_ids: userIds.join(',') }),
    [userIds]
  )

  // Fetch Users (needed to map user names to colors if user_id is missing in event)
  const { data: usersRaw } = useApi<FUser[]>(
    () => userEndpoint.fetchAll(),
    []
  )

  // Fetch Total Global Event Count for default title naming
  const { data: eventCount, refetch: refetchEventCount } = useApi<any>(
    () => eventEndpoint.count(),
    []
  )

  // Robust parsing of count (might be number, {count: X}, or [{count: X}])
  const safeEventCount = useMemo(() => {
    if (typeof eventCount === 'number') return eventCount
    if (Array.isArray(eventCount)) {
      const first = eventCount[0]
      return typeof first === 'number' ? first : (Object.values(first ?? {})[0] as number ?? 0)
    }
    if (typeof eventCount === 'object' && eventCount !== null) {
      return (Object.values(eventCount)[0] as number ?? 0)
    }
    return 0
  }, [eventCount])

  const events = eventsRaw || []
  const categories = categoriesRaw || []
  const users = usersRaw || []

  useEffect(() => {
    setUserIds(resolveUserIds(selectionState.selectedIds))
  }, [selectionState.selectedIds])

  // Build a map of UserName -> Color
  const userColorMap = useMemo(() => {
    const map = new Map<string, string>()
    
    // 1. Generate base color map from viewState (keys are view IDs like u:1, g:1, etc.)
    const baseColorMap = buildUserColorMap(
      viewState,
      BASE_COLOR_HEX,
      EQU_DIST_COUNT,
      LUMINANCE_PRESET
    )

    // 2. Map user names to their colors
    users.forEach(u => {
        if (u.id && u.name) {
            const viewId = makeUserViewId(u.id)
            const color = baseColorMap.get(viewId)
            if (color) {
                map.set(u.name, color)
            }
        }
    })

    return map
  }, [viewState, users])

  const { groupedEvents, uncategorizedEvents } = useMemo(() => {
    const map = new Map<number, FEventWithCategory[]>()
    
    // Initialize with empty arrays for all categories
    categories.forEach(cat => {
      if (cat.id) map.set(cat.id, [])
    })

    const uncategorized: FEventWithCategory[] = []

    events.forEach(event => {
      if (event.category_id && map.has(event.category_id)) {
        map.get(event.category_id)?.push(event)
      } else {
        uncategorized.push(event)
      }
    })

    const sortByDate = (a: FEventWithCategory, b: FEventWithCategory) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()

    // Sort all groups
    map.forEach(group => group.sort(sortByDate))
    uncategorized.sort(sortByDate)

    return { groupedEvents: map, uncategorizedEvents: uncategorized }
  }, [events, categories])

  // Sort categories by number of events (descending)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = (a.id && groupedEvents.get(a.id)?.length) || 0;
      const countB = (b.id && groupedEvents.get(b.id)?.length) || 0;
      return countB - countA;
    })
  }, [categories, groupedEvents])

  // If latency issues on user change in store it could come from this
  function resolveUserIds(ids: string[]): string[] {
    const uniqueUserIds = new Set<string>()
    
    const visit = (id: string) => {
      const item = viewState.items[id]
      if (!item) return
      
      if ('userId' in item) {
        uniqueUserIds.add(String(item.userId))
      } else if ('children' in item) {
        item.children.forEach(visit)
      }
    }
    
    ids.forEach(visit)
    return Array.from(uniqueUserIds)
  }

  const handleCategoryNameUpdate = async (id: number, newName: string) => {
    try {
      await categoryEndpoint.update(id, { name: newName })
      refetchCategories()
      refetchEventCount()
      showSuccessToast("Catégorie mise à jour")
    } catch (error) {
       showErrorToast(error, "Impossible de modifier le nom de la catégorie")
    }
  }

  const handleCategoryDelete = async (id: number) => {
    try {
      await categoryEndpoint.remove(id, {})
      refetchCategories()
      refetchEvents()
      refetchEventCount() // Count changes
      showSuccessToast("Catégorie supprimée")
    } catch (error) {
      showErrorToast(error, "Impossible de supprimer la catégorie")
    }
  }

  return (
    <div className="space-y-6">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gestion des évènements</CardTitle>
            <EventDialog 
              userIds={userIds} 
              onSuccess={() => {
                refetchEvents()
                refetchEventCount()
              }} 
              categories={categories}
              availableUsers={users}
              nextEventNumber={safeEventCount + 1}
            />
         </CardHeader>
          <CardContent>
             <p className="text-muted-foreground mb-4">
                Ajoutez, modifiez ou supprimez des évènements temporels.
             </p>
          </CardContent>
       </Card>

      {loadingEvents && !eventsRaw ? (
        <div>Chargement des évènements...</div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map(category => (
            <CategoryEventList
                key={category.id}
                category={category}
                events={groupedEvents.get(category.id!) || []}
                userIds={userIds}
                userColorMap={userColorMap}
                onRefresh={() => {
                  refetchEvents()
                  refetchEventCount()
                }}
                onUpdateName={(val) => category.id && handleCategoryNameUpdate(category.id, val)}
                onDelete={() => category.id && handleCategoryDelete(category.id)}
                categories={categories}
                availableUsers={users}
                nextEventNumber={safeEventCount + 1}
            />
          ))}

          {uncategorizedEvents.length > 0 && (
            <CategoryEventList
                title="Non classés"
                events={uncategorizedEvents}
                userIds={userIds}
                userColorMap={userColorMap}
                onRefresh={() => {
                  refetchEvents()
                  refetchEventCount()
                }}
                categories={categories}
                availableUsers={users}
                nextEventNumber={safeEventCount + 1}
            />
          )}
        </div>
      )}
    </div>
  )
}
