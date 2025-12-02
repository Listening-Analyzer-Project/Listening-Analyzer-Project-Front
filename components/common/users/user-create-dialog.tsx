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

//TODO mettre dans un fichier types pour les forms (gérer plus tard, alban a fait quelque chose là dessus)
type UserCreateForm = {
  name: string
  type: number
  isadmin: boolean
  syncro_status: number
}

export default function UserCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (data: UserCreateForm) => Promise<void> | void
}) {
  const form = useForm<UserCreateForm>({
    defaultValues: {
      name: '',
      type: 0,
      isadmin: false,
      syncro_status: 0,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        type: 0,
        isadmin: false,
        syncro_status: 0,
      })
    }
  }, [open])

  const handleSubmit = async (data: UserCreateForm) => {
    try {
      await onCreate(data)
      onOpenChange(false)
    } catch (err) {
      //TODO gérer erreurs
      console.error('UserCreateDialog create error', err)
      alert('Erreur lors de la création (voir console)')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Créer utilisateur</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input {...form.register('name')} autoFocus placeholder="Prénom Nom" />
          </div>

          <div>
            <label className="text-sm font-medium">Type</label>
            <Input
              type="number"
              {...form.register('type', {
                setValueAs: v => (v === '' ? 0 : Number(v)),
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
                setValueAs: v => (v === '' ? 0 : Number(v)),
              })}
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}