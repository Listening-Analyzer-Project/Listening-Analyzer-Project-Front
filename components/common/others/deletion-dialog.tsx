'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export default function DeletionDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Delete?',
  description = 'This action is irreversible. Do you want to continue?',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
