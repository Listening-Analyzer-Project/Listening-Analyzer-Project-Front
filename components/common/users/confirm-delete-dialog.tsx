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

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Supprimer cet utilisateur ?',
  description = 'Cette action est irréversible. Voulez-vous continuer ?',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: string
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
            <Button variant="outline">Annuler</Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await onConfirm()
                onOpenChange(false)
              }}
            >
              Supprimer
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
