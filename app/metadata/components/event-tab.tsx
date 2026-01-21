'use client'

import { useEffect, useMemo, useState } from 'react'

import { ChevronRight, Plus } from 'lucide-react'

import EditableText from '@/components/common/editable-text'
import { Button } from '@/components/ui/button'
import { userEndpoint } from '@/lib/api'
import { categoryEndpoint } from '@/lib/api/core/category-endpoint'
import { eventEndpoint } from '@/lib/api/core/event-endpoint'
import { useApi } from '@/lib/hooks'
import { useUsersViewStore } from '@/lib/store'
import { useColorStore } from '@/lib/store/colors/colors-store'
import { SYNC_USER_EVENT } from '@/lib/sync-signals'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'
import { FCategory, FEventWithCategory, FUser } from '@/types'
import CategoryEventList from './event/category-event-list'
import EventDialog from './event/event-dialog'



export default function EventTab() {
  const { selectionState, viewState } = useUsersViewStore()
  const [userIds, setUserIds] = useState<string[]>([])
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Fetch Categories
  const { data: categoriesRaw, refetch: refetchCategories, setData: setCategories } = useApi<FCategory[]>(
    () => categoryEndpoint.fetchAll(),
    []
  )

  // Fetch Events
  const { data: eventsRaw, loading: loadingEvents, refetch: refetchEvents, setData: setEvents } = useApi<FEventWithCategory[]>(
    () => eventEndpoint.fetchAllWithCategory({ user_ids: userIds.join(',') }),
    [userIds]
  )

  // Fetch Users (needed to map user names to colors if user_id is missing in event)
  const { data: usersRaw, refetch: refetchUsers } = useApi<FUser[]>(
    () => userEndpoint.fetchAll(),
    []
  )

  useEffect(() => {
    const handleUserUpdate = () => refetchUsers()
    window.addEventListener(SYNC_USER_EVENT, handleUserUpdate)
    return () => window.removeEventListener(SYNC_USER_EVENT, handleUserUpdate)
  }, [refetchUsers])

  // Fetch Total Global Event Count for default title naming
  const { data: eventCount, refetch: refetchEventCount } = useApi<any>(
    () => eventEndpoint.count(),
    []
  )
  
  const events = eventsRaw || []
  const categories = categoriesRaw || []
  const users = usersRaw || []

  const nextCategoryNumber = categories.length + 1
  
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


  useEffect(() => {
    setUserIds(resolveUserIds(selectionState.selectedIds))
  }, [selectionState.selectedIds])

  const { userColors } = useColorStore()

   const usersById = useMemo(() => {
     return new Map(users.map(u => [u.id!, u]))
   }, [users])


  // Build a map of UserName -> Color using the STORE
  const userColorMap = useMemo(() => {
    const map = new Map<string, string>()

    users.forEach(u => {
        if (u.id && u.name) {
            // Retrieve from store using NAME
            const color = userColors.get(u.name)
            if (color) {
                map.set(u.name, color)
            }
        }
    })

    return map
  }, [userColors, users])

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
    // Optimistic Update
    setCategories(prev => prev ? prev.map(c => c.id === id ? { ...c, name: newName } : c) : prev)

    try {
      await categoryEndpoint.update(id, { name: newName })
      refetchCategories()
      refetchEventCount()
      showSuccessToast("Category updated")
    } catch (error) {
       // Rollback on error
       refetchCategories()
       showErrorToast(error, "Failed to update category name")
    }
  }

  const handleCategoryDelete = async (id: number) => {
    try {
      await categoryEndpoint.remove(id, {})
      refetchCategories()
      refetchEvents()
      refetchEventCount() // Count changes
      showSuccessToast("Category deleted")
    } catch (error) {
      showErrorToast(error, "Failed to delete category")
    }
  }

  const handleEventRename = (id: number, newTitle: string) => {
    setEvents(prev => prev ? prev.map(e => e.id === id ? { ...e, title: newTitle } : e) : prev)
  }

  const handleCreateCategory = async (name: string) => {
    setIsCreatingCategory(false)
    if (!name || name.trim() === "") return
    
    try {
        await categoryEndpoint.create({ name })
        showSuccessToast("Category created")
        refetchCategories()
        refetchEventCount()
    } catch (error) {
        showErrorToast(error, "Failed to create category")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Events Management</h2>
        <p className="text-muted-foreground text-sm">
          Add, edit, or delete events.
        </p>
      </div>

      <div className="flex justify-end pr-1">
        <EventDialog
          userIds={userIds}
          onSuccess={() => {
            refetchEvents()
            refetchEventCount()
          }}
          categories={categories}
          availableUsers={users}
          nextEventNumber={safeEventCount + 1}
          nextCategoryNumber={nextCategoryNumber}
          trigger={
            <div className="flex items-center gap-2 cursor-pointer group text-muted-foreground hover:text-foreground w-fit">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full shrink-0 border border-dashed border-muted-foreground/30 bg-white hover:bg-accent p-0 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium">Create an event</span>
            </div>
          }
        />
      </div>

      {loadingEvents && !eventsRaw ? (
        <div>Loading events...</div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((category) => (
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
              onUpdateName={(val) =>
                category.id && handleCategoryNameUpdate(category.id, val)
              }
              onDelete={() => category.id && handleCategoryDelete(category.id)}
              onEventRename={handleEventRename}
              categories={categories}
              availableUsers={users}
              nextEventNumber={safeEventCount + 1}
            />
          ))}

          {isCreatingCategory && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200 fade-in">
              <div className="flex items-center gap-2 select-none">
                <div className="p-1 rounded-md transition-all duration-200 text-muted-foreground rotate-90">
                  <ChevronRight className="h-4 w-4" />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <EditableText
                    value={`Category ${nextCategoryNumber}`}
                    onChange={handleCreateCategory}
                    onCancel={() => setIsCreatingCategory(false)}
                    mode="text"
                    placeholder="New Category Name"
                    startInEditMode={true}
                    allowEmpty={true}
                    fontSize={18}
                    fontWeight="600"
                    autoWidth
                    cancelOnBlur={true}
                  />
                  <span className="text-xs text-muted-foreground">(0)</span>
                </div>
              </div>

              <div className="pl-6">
                <div className="flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden">
                  <div className="text-sm text-muted-foreground italic p-4">
                    No events in this category.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isCreatingCategory && (
            <div
              className="flex items-center gap-2 cursor-pointer group text-muted-foreground hover:text-foreground pl-1 w-fit"
              onClick={() => setIsCreatingCategory(true)}
            >
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full shrink-0 border border-dashed border-muted-foreground/30 bg-white hover:bg-accent p-0 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium">Create a category</span>
            </div>
          )}

          {uncategorizedEvents.length > 0 && (
            <CategoryEventList
              title="Uncategorized"
              events={uncategorizedEvents}
              userIds={userIds}
              userColorMap={userColorMap}
              onRefresh={() => {
                refetchEvents()
                refetchEventCount()
              }}
              onEventRename={handleEventRename}
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
