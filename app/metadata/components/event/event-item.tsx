import { Pencil, Trash2 } from 'lucide-react'
import { memo, useState } from 'react'

import EditableText from '@/components/common/editable-text'
import { Button } from '@/components/ui/button'

import DeletionDialog from '@/components/common/others/deletion-dialog'
import { eventEndpoint } from '@/lib/api/core/event-endpoint'

import { getTextColorForBackground } from '@/lib/utils'
import { formatDateToDisplay } from '@/lib/utils/format-date'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'

import { FCategory, FEventWithCategory, FUser } from '@/types'

import EventDialog from './event-dialog'

interface EventItemProps {
  event: FEventWithCategory
  onRefresh: () => void
  userIds: string[]
  userColorMap?: Map<string, string>
  categories?: FCategory[]
  availableUsers?: FUser[]
  nextEventNumber?: number
}

const EventItem = memo(function EventItem({ event, onRefresh, userIds, userColorMap, categories, availableUsers, nextEventNumber }: EventItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const startStr = formatDateToDisplay(event.start_date, "day")
  const endStr = formatDateToDisplay(event.end_date, "day")
  
  const dateStr = startStr === endStr 
    ? startStr
    : `${startStr} - ${endStr}`

  // Determine user color
  let userColor: string | undefined
  let textColor: string | undefined
  
  // Try to find color by user_name
  if (userColorMap && event.user_name) {
    userColor = userColorMap.get(event.user_name)
    if (userColor) {
        textColor = getTextColorForBackground(userColor, '#000000', '#ffffff')
    }
  }

  const handleDelete = async () => {
    try {
        if (!event.id) return
        await eventEndpoint.remove(event.id)
        showSuccessToast('Event deleted')
        onRefresh()
    } catch (err) {
        showErrorToast(err, 'Failed to delete event')
    }
  }

  const handleTitleChange = async (newTitle: string,) => {
    try {
      if (!event.id || newTitle === event.title) return
      
      if (newTitle.trim() === "") {
        setTimeout(() => {
          setIsDeleteDialogOpen(true)
        }, 50)
        return
      }
      
      let userId: number | undefined = undefined
      if (event.user_name) {
        const user = availableUsers?.find(u => u.name === event.user_name)
        if (!user) {
          showErrorToast(new Error("User not found"), "Error")
          return
        }
        userId = user.id
      }

      const payload: any = {
        title: newTitle,
        start_date: event.start_date,
        end_date: event.end_date,
        description: event.description || '',
        category_id: event.category_id,
        user_id: userId
      }

      await eventEndpoint.update(event.id, payload)
      showSuccessToast('Event renamed')
      onRefresh()
    } catch (err) {
      showErrorToast(err, 'Failed to rename event')
    }
  }

  return (
    <div className="px-4 py-2 bg-white hover:bg-gray-50 flex justify-between items-center group transition-colors">
      <div className="flex flex-col gap-0.5 w-full max-w-[calc(100%-4rem)]">
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
             <EditableText
               value={event.title}
               onChange={handleTitleChange}
               mode="text"
               placeholder="Event title"
               fontSize={16}
               fontSizeRatio={0.6}
               fontWeight="500"
               autoWidth
               allowEmpty={true}
             />
             
             <span className="text-xs text-muted-foreground whitespace-nowrap">
               {dateStr}
             </span>

             <span 
               className="inline-block px-1.5 py-0.5 text-[10px] rounded-full leading-none whitespace-nowrap"
               style={{ 
                 backgroundColor: event.user_name ? (userColor || '#e5e7eb') : '#e5e7eb',
                 color: event.user_name ? (textColor || '#374151') : '#374151',
                 border: (event.user_name && userColor) ? 'none' : '1px solid #d1d5db'
               }}
             >
               {event.user_name || 'All users'}
             </span>
        </div>
        
        {event.description && (
            <div className="text-xs text-gray-500 line-clamp-1 max-w-xl">
                {event.description}
            </div>
        )}
      </div>

      <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <EventDialog 
            userIds={userIds} 
            onSuccess={onRefresh} 
            event={event}
            categories={categories}
            availableUsers={availableUsers}
            nextEventNumber={nextEventNumber}
            trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            }
        />
        
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
        >
            <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <DeletionDialog 
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDelete}
            title="Delete event ?"
            description="This action is irreversible."
        />
      </div>
    </div>
  )
})

export default EventItem
