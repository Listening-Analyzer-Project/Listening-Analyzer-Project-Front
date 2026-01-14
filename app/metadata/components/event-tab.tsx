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
import DataEventDialog from './event/data-event-dialog'

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
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

  const events = eventsRaw || []
  const categories = categoriesRaw || []
  const users = usersRaw || []

  const resolveUserIds = (ids: string[]): string[] => {
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

  const handleCategoryNameUpdate = async (id: number, newName: string) => {
    try {
      await categoryEndpoint.update(id, { name: newName })
      refetchCategories()
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
      showSuccessToast("Catégorie supprimée")
    } catch (error) {
      showErrorToast(error, "Impossible de supprimer la catégorie")
    }
  }

  // Sort categories by number of events (descending)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = (a.id && groupedEvents.get(a.id)?.length) || 0;
      const countB = (b.id && groupedEvents.get(b.id)?.length) || 0;
      return countB - countA;
    })
  }, [categories, groupedEvents])

  return (
    <div className="space-y-6">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gestion des évènements</CardTitle>
            <DataEventDialog 
              userIds={userIds} 
              existingTitles={events.map(e => e.title)} 
              onSuccess={refetchEvents} 
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
                existingTitles={events.map(e => e.title)}
                userColorMap={userColorMap}
                onRefresh={refetchEvents}
                onUpdateName={(val) => category.id && handleCategoryNameUpdate(category.id, val)}
                onDelete={() => category.id && handleCategoryDelete(category.id)}
            />
          ))}

          {uncategorizedEvents.length > 0 && (
            <CategoryEventList
                title="Non classés"
                events={uncategorizedEvents}
                userIds={userIds}
                existingTitles={events.map(e => e.title)}
                userColorMap={userColorMap}
                onRefresh={refetchEvents}
            />
          )}
        </div>
      )}
    </div>
  )
}
