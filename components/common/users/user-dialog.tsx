'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export type UserForm = {
  id?: number
  name?: string
  type?: number
  isadmin?: boolean
  syncro_status?: number
}

export default function UserDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultValues?: Partial<UserForm>
  onSave: (payload: UserForm) => Promise<void> | void
}) {
  const form = useForm<UserForm>({
    defaultValues: defaultValues ?? {
      name: '',
      type: 0,
      isadmin: false,
      syncro_status: 0,
    },
  })

  // Reset form values when defaultValues or open change
  useEffect(() => {
    form.reset(defaultValues ?? { name: '', type: 0, isadmin: false, syncro_status: 0 })
  }, [defaultValues, open])

  const handleSubmit = async (data: UserForm) => {
    try {
      await onSave(data)
      onOpenChange(false)
    } catch (err) {
      console.error('UserDialog save error', err)
      alert('Erreur lors de la sauvegarde (voir console)')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Modifier utilisateur' : 'Créer utilisateur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input {...form.register('name')} placeholder="Prénom Nom" autoFocus />
          </div>

          <div>
            <label className="text-sm font-medium">Type</label>
            <Input
              type="number"
              {...form.register('type', {
                setValueAs: v => (v === '' ? undefined : Number(v)),
              })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" {...form.register('isadmin')} className="h-4 w-4" />
            <label className="text-sm font-medium">Is admin</label>
          </div>

          <div>
            <label className="text-sm font-medium">Syncro status</label>
            <Input
              type="number"
              {...form.register('syncro_status', {
                setValueAs: v => (v === '' ? undefined : Number(v)),
              })}
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
