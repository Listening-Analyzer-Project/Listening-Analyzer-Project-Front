// TODO : travail date

import EditableText from '@/components/common/editable-text'
import { Pencil, Trash2 } from 'lucide-react'
import { memo } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button'
import { eventEndpoint } from '@/lib/api/core/event-endpoint'
import { getTextColorForBackground } from '@/lib/utils'
import { formatDateToDisplay } from '@/lib/utils/format-date'
import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'
import { FEventWithCategory } from '@/types'

import DataEventDialog from './data-event-dialog'

interface EventListItemProps {
  event: FEventWithCategory
  onRefresh: () => void
  userIds: string[] // needed for edit dialog
  existingTitles: string[] // needed for edit dialog
  userColorMap?: Map<string, string>
}

const DataEventListItem = memo(function DataEventListItem({ event, onRefresh, userIds, existingTitles, userColorMap }: EventListItemProps) {
  const startStr = formatDateToDisplay(event.start_date, "day")
  const endStr = formatDateToDisplay(event.end_date, "day")
  
  const dateStr = startStr === endStr 
    ? startStr
    : `${startStr} - ${endStr}`

  const handleDelete = async () => {
    try {
        if (!event.id) return
        await eventEndpoint.remove(event.id)
        showSuccessToast('Évènement supprimé')
        onRefresh()
    } catch (err) {
        showErrorToast(err, 'Erreur lors de la suppression')
    }
  }

  const handleTitleChange = async (newTitle: string) => {
    try {
      if (!event.id || newTitle === event.title) return
      if (newTitle.trim() === "") {
        showErrorToast(new Error("Le titre ne peut pas être vide"), "Erreur")
        return
      }

      const payload: any = {
        title: newTitle,
        start_date: event.start_date,
        end_date: event.end_date,
        description: event.description,
        category_id: event.category_id
      }

      await eventEndpoint.update(event.id, payload)
      showSuccessToast('Évènement renommé')
      onRefresh()
    } catch (err) {
      showErrorToast(err, 'Erreur lors du renommage')
    }
  }

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

  return (
    <div className="px-4 py-2 bg-white hover:bg-gray-50 flex justify-between items-center group transition-colors">
      <div className="flex flex-col gap-0.5 w-full max-w-[calc(100%-4rem)]">
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
             <EditableText
               value={event.title}
               onChange={handleTitleChange}
               mode="text"
               placeholder="Titre de l'évènement"
               fontSize={16}
               fontSizeRatio={0.6}
               fontWeight="500"
               autoWidth
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
        <DataEventDialog 
            userIds={userIds} 
            existingTitles={existingTitles} 
            onSuccess={onRefresh} 
            event={event}
            trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            }
        />
        
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer l&apos;évènement ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
})

export default DataEventListItem
