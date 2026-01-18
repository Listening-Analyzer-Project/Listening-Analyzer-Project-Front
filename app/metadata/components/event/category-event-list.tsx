import { ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'

import DeletionDialog from '@/components/common/others/deletion-dialog'

import { cn } from '@/lib/utils'

import { FCategory, FEventWithCategory, FUser } from '@/types'

import EditableText from '@/components/common/editable-text'
import EventItem from './event-item'

interface CategoryEventListProps {
  category?: FCategory
  title?: string
  events: FEventWithCategory[]
  userIds: string[]
  userColorMap?: Map<string, string>
  onRefresh: () => void
  onUpdateName?: (newName: string) => void
  onDelete?: () => void
  categories?: FCategory[]
  availableUsers?: FUser[]
  nextEventNumber?: number
}

const CategoryEventList = memo(function CategoryEventList({
  category,
  title,
  events,
  userIds,
  userColorMap,
  onRefresh,
  onUpdateName,
  onDelete,
  categories,
  availableUsers,
  nextEventNumber
}: CategoryEventListProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const displayTitle = category ? category.name : title
  const eventCount = events.length

  const handleNameChange = (newName: string) => {
    if (newName === "" && onDelete) {
      setShowDeleteDialog(true)
    } else if (onUpdateName) {
      onUpdateName(newName)
    }
  }

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
                   onChange={handleNameChange}
                   mode="text"
                   placeholder="Category Name"
                   fontSize={18}
                   fontSizeRatio={0.6}
                   fontWeight="600"
                   autoWidth
                   allowEmpty={true}
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
                        <EventItem
                            key={event.id}
                            event={event}
                            onRefresh={onRefresh}
                            userIds={userIds}
                            userColorMap={userColorMap}
                            categories={categories}
                            availableUsers={availableUsers}
                            nextEventNumber={nextEventNumber}
                        />
                    ))
                )}
            </div>
        </div>
      )}

      <DeletionDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => onDelete?.()}
        title="Supprimer la catégorie ?"
        description={
          <>
            <strong>Attention :</strong> Cette action supprimera la catégorie "{displayTitle}".
            <br /><br />
            Les évènements associés ne seront pas supprimés mais deviendront non classés. Cette action est irréversible.
          </>
        }
      />
    </div>
  )
})

export default CategoryEventList
