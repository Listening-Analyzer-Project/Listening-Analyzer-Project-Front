import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import EditableText from '@/components/common/editable-text'
import { cn } from '@/lib/utils'
import { FCategory, FEventWithCategory } from '@/types'

import DataEventListItem from './data-event-list-item'

interface CategoryEventListProps {
  category?: FCategory
  title?: string // For uncategorized fallback
  events: FEventWithCategory[]
  userIds: string[]
  existingTitles: string[]
  userColorMap?: Map<string, string>
  onRefresh: () => void
  onUpdateName?: (newName: string) => void
}

export default function CategoryEventList({
  category,
  title,
  events,
  userIds,
  existingTitles,
  userColorMap,
  onRefresh,
  onUpdateName
}: CategoryEventListProps) {
  const [isOpen, setIsOpen] = useState(false)

  const displayTitle = category ? category.name : title
  const eventCount = events.length

  return (
    <div className="space-y-2">
      <div 
        className="flex items-center gap-2 cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
         <div className={cn(
           "p-1 rounded-md transition-all duration-200 text-muted-foreground group-hover:text-foreground group-hover:bg-muted",
           isOpen && "rotate-90"
         )}>
            <ChevronRight className="h-4 w-4" />
         </div>

         <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
             {category && onUpdateName ? (
                 <EditableText
                   value={displayTitle || ''}
                   onChange={onUpdateName}
                   mode="text"
                   placeholder="Category Name"
                   fontSize={18}
                   fontSizeRatio={0.6}
                   fontWeight="600"
                   autoWidth
                 />
             ) : (
                 <span className="font-semibold text-lg text-muted-foreground">{displayTitle}</span>
             )}
             <span className="text-xs text-muted-foreground">({eventCount})</span>
         </div>
      </div>
      
      {isOpen && (
        <div className="pl-6 animate-in slide-in-from-top-2 duration-200 fade-in">
            <div className="flex flex-col rounded-lg border overflow-hidden shadow-sm divide-y bg-white">
                {events.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic p-4">Aucun évènement dans cette catégorie.</div>
                ) : (
                    events.map(event => (
                        <DataEventListItem
                            key={event.id}
                            event={event}
                            onRefresh={onRefresh}
                            userIds={userIds}
                            existingTitles={existingTitles}
                            userColorMap={userColorMap}
                        />
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  )
}
