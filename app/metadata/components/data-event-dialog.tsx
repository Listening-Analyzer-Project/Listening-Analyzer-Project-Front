'use client'

import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import categoryEndpoint from '@/lib/api/core/category-endpoint'
import eventEndpoint from '@/lib/api/core/event-endpoint'
import userEndpoint from '@/lib/api/core/user-endpoint'
import { useApi } from '@/lib/hooks'
import { cn } from '@/lib/utils'; // Fixed import based on recent fix
import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'
import { FCategory, FEvent, FEventWithCategory, FUser } from '@/types'

interface EventDialogProps {
  userIds: string[]
  existingTitles: string[]
  onSuccess: () => void
  event?: FEventWithCategory // Optional: If present, we are editing
  trigger?: React.ReactNode // Optional trigger to override default button
}

export default function DataEventDialog({ userIds, existingTitles, onSuccess, event, trigger }: EventDialogProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!event
  
  // Fetch categories
  const { data: categories } = useApi<FCategory[]>(
    () => categoryEndpoint.fetchAll(),
    []
  )

  // Fetch users for proper display
  const { data: availableUsers } = useApi<FUser[]>(
    () => userEndpoint.fetchAll(),
    []
  )

  const defaultTitle = (() => {
    let i = 1
    while (existingTitles.includes(`Event ${i}`)) {
      i++
    }
    return `Event ${i}`
  })()

  // Form setup
  const form = useForm<Partial<FEvent> & { category_name_input?: string }>({
    defaultValues: {
      title: event?.title || defaultTitle,
      description: event?.description || '',
      start_date: event?.start_date || new Date().toISOString(),
      end_date: event?.end_date || new Date().toISOString(),
      category: event?.category_id ? { id: event.category_id } as any : undefined,
      user: event?.user_name ? undefined : (userIds.length > 0 ? { id: Number(userIds[0]) } : {} as any)
      // Note: for edit, we might need to map user_name back to ID if we don't have user_id in FEventWithCategory
      // FEventWithCategory has user_name, but not user_id apparently based on types. 
      // But FEvent has user object. FEventWithCategory extends FEvent usually? 
      // Let's assume FEventWithCategory might have standard FEvent fields if intersection or look at definition.
      // Definition: FEventWithCategory { ... user_name?: string; category_id?: number ... }
      // It implies it might not have the full 'user' object. 
      // We might need to find the user ID from the name or hope we can get it.
      // Actually typical fetchAllWithCategory might return user object too if backend sends it.
      // For now, if editing, we try to match user by Name from availableUsers if ID is missing.
    }
  })

  // State for category selection
  const [isNewCategory, setIsNewCategory] = useState(false)
  const [categorySelectValue, setCategorySelectValue] = useState<string | undefined>(undefined)

  // Initialize form when opening
  useEffect(() => {
    if (open) {
        if (isEditing && event) {
            form.reset({
                title: event.title,
                description: event.description || '',
                start_date: event.start_date,
                end_date: event.end_date,
                category: event.category_id ? { id: event.category_id } as any : undefined,
            })
            // category select UI
            if (event.category_id) {
                setCategorySelectValue(event.category_id.toString())
            }
            // User matching
            if (availableUsers && event.user_name) {
                const u = availableUsers.find(u => u.name === event.user_name)
                if (u && u.id) {
                    form.setValue('user.id', u.id)
                }
            }
        } else {
            // Create mode logic (defaults)
            let i = 1
            while (existingTitles.includes(`Event ${i}`)) {
                i++
            }
            form.setValue('title', `Event ${i}`)
            const now = new Date().toISOString()
            form.setValue('start_date', now)
            form.setValue('end_date', now)
            if (userIds.length > 0) {
                 // Default to All Users (undefined) explicitly, so no need to set specific user ID
                 form.setValue('user.id', undefined)
            }
            setCategorySelectValue('uncategorized')
            setIsNewCategory(false)
        }
    }
  }, [open, existingTitles, form, userIds, isEditing, event, availableUsers]) // Dependency on availableUsers to set defaults

  const onSubmit = async (data: any) => {
    try {
      const payload: any = {
        title: data.title,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        user_id: data.user?.id ? Number(data.user.id) : undefined,
      }

      let categoryId = data.category?.id

      if (data.category_name_input) {
         const newCat = await categoryEndpoint.create({ name: data.category_name_input })
         categoryId = newCat.id
      }
      
      if (categoryId) {
        payload.category_id = Number(categoryId)
      } else {
        payload.category_id = null // Ensure we can unset category
      }

      if (isEditing && event?.id) {
        await eventEndpoint.update(event.id, payload)
        showSuccessToast('Évènement modifié')
      } else {
        await eventEndpoint.create(payload)
        showSuccessToast('Évènement créé')
      }
      
      setOpen(false)
      onSuccess()
    } catch (err) {
      showErrorToast(err, isEditing ? 'Erreur lors de la modification' : 'Erreur lors de la création')
    }
  }

  const DatePicker = ({ field, label }: { field: any, label: string }) => (
     <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(new Date(field.value), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Créer un évènement</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier l'évènement" : "Créer un nouvel évènement"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations de l'évènement." : "Ajoutez un évènement à votre timeline."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => <DatePicker field={field} label="Date de début" />}
                />
                <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => <DatePicker field={field} label="Date de fin" />}
                />
            </div>

            <FormField
              control={form.control}
              name="user.id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilisateur</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'global' ? undefined : Number(val))} 
                    value={field.value?.toString() || 'global'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="global">All users</SelectItem>
                      {availableUsers ? (
                          availableUsers.map(u => (
                              <SelectItem key={u.id} value={u.id?.toString() || ''}>{u.name}</SelectItem>
                          ))
                      ) : (
                           userIds.map(id => (
                            <SelectItem key={id} value={id}>User {id}</SelectItem>
                           ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
                <Label>Catégorie</Label>
                <div className="flex gap-2">
                    <Select 
                        value={categorySelectValue || 'uncategorized'}
                        onValueChange={(val) => {
                            setCategorySelectValue(val)
                            if (val === 'new') {
                                setIsNewCategory(true)
                                form.setValue('category.id', undefined) 
                            } else if (val === 'uncategorized') {
                                setIsNewCategory(false)
                                form.setValue('category.id', undefined)
                                form.setValue('category_name_input', '')
                            } else {
                                setIsNewCategory(false)
                                form.setValue('category.id', Number(val))
                                form.setValue('category_name_input', '')
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            <SelectItem value="new">+ Nouvelle catégorie</SelectItem>
                            {categories?.map(cat => (
                                <SelectItem key={cat.id} value={cat.id?.toString() || ''}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isNewCategory && (
                    <FormField
                        control={form.control}
                        name="category_name_input"
                        render={({ field }) => (
                             <Input {...field} placeholder="Nom de la nouvelle catégorie" /> 
                        )}
                    />
                )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
