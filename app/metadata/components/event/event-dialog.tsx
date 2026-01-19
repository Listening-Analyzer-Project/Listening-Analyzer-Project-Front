'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import categoryEndpoint from '@/lib/api/core/category-endpoint'
import eventEndpoint from '@/lib/api/core/event-endpoint'

import { showErrorToast, showSuccessToast } from '@/lib/utils/toasts/toast-handler'

import { FormDatePicker } from '@/components/common/form-date-picker'
import { FCategory, FEvent, FEventWithCategory, FUser } from '@/types'

interface EventDialogProps {
  userIds: string[]
  onSuccess: () => void
  event?: FEventWithCategory
  trigger?: React.ReactNode
  categories?: FCategory[]
  availableUsers?: FUser[]
  nextEventNumber?: number
  nextCategoryNumber?: number
}

export default function EventDialog({ userIds, onSuccess, event, trigger, categories, availableUsers, nextEventNumber, nextCategoryNumber }: EventDialogProps) {
  const [open, setOpen] = useState(false)
  
  // Form setup
  const form = useForm<Partial<FEvent> & { category_name_input?: string }>({
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      start_date: event?.start_date || new Date().toISOString(),
      end_date: event?.end_date || new Date().toISOString(),
      category: event?.category_id ? { id: event.category_id } as any : undefined,
      user: event?.user_name ? undefined : (userIds.length > 0 ? { id: Number(userIds[0]) } : {} as any)
    }
  })

  // State for category selection
  const [isNewCategory, setIsNewCategory] = useState(false)
  const [categorySelectValue, setCategorySelectValue] = useState<string | undefined>(undefined)

  const isEditing = !!event

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
            form.setValue('title', `Event ${nextEventNumber ?? 1}`)
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
  }, [open, nextEventNumber, form, userIds, isEditing, event, availableUsers]) // Dependency on availableUsers to set defaults

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
        showSuccessToast('Event updated')
      } else {
        await eventEndpoint.create(payload)
        showSuccessToast('Event created')
      }
      
      setOpen(false)
      onSuccess()
    } catch (err) {
      showErrorToast(err, isEditing ? 'Failed to update event' : 'Failed to create event')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Create an event</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit event" : "Create a new event"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the event information." : "Add an event to your timeline."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
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
                    render={({ field }) => (
                      <FormDatePicker field={field} label="Start Date" />
                    )}
                />
                <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormDatePicker field={field} label="End Date" />
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="user.id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'global' ? undefined : Number(val))} 
                    value={field.value?.toString() || 'global'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
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
                <Label>Category</Label>
                <div className="flex gap-2">
                    <Select 
                        value={categorySelectValue || 'uncategorized'}
                        onValueChange={(val) => {
                            setCategorySelectValue(val)
                            if (val === 'new') {
                                setIsNewCategory(true)
                                form.setValue('category.id', undefined)
                                form.setValue('category_name_input', `Category ${nextCategoryNumber ?? (categories?.length || 0) + 1}`) 
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
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            {categories?.map(cat => (
                                <SelectItem key={cat.id} value={cat.id?.toString() || ''}>{cat.name}</SelectItem>
                            ))}
                            <SelectItem value="new">+ New category</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {isNewCategory && (
                    <FormField
                        control={form.control}
                        name="category_name_input"
                        render={({ field }) => (
                             <Input {...field} placeholder="New category name" /> 
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
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
