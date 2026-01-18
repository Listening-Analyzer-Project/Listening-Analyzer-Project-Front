'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

interface FormDatePickerProps {
  field: any
  label: string
  placeholder?: string
}

export function FormDatePicker({ field, label, placeholder = "Pick a date" }: FormDatePickerProps) {
  return (
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
                <span>{placeholder}</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value ? new Date(field.value) : undefined}
            onSelect={(date) => field.onChange(date?.toISOString())}
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2099, 11)}
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )
}
