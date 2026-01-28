"use client"

import { cn } from "@/lib/utils"

import EditableText from "@/components/common/editable-text"
import { useDraggable } from "@dnd-kit/core"

export interface MetadataItemProps {
    item?: { id?: number; name: string }
    groupId: number
    groupName: string
    color?: string
    darkTextColor?: string
    lightTextColor?: string
    onNameChange?: (item: { id?: number; name: string }, groupId: number, groupName: string, newName: string) => Promise<void>
    type: 'sub' | 'tag' // To distinguish in drag events
    // Pending mode props
    isPending?: boolean
    onCancel?: () => void
    placeholder?: string
    defaultValue?: string
    isOverlay?: boolean
}

const SOFT_DARK_TEXT_COLOR = '#374151'
const LIGHT_TEXT_COLOR = '#FFFFFF'

export function MetadataItem({ 
    item, 
    groupId, 
    groupName, 
    color, 
    darkTextColor, 
    lightTextColor, 
    onNameChange, 
    type,
    isPending = false,
    onCancel,
    placeholder,
    defaultValue,
    isOverlay = false
}: MetadataItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: isPending ? `pending-${type}-${groupId}` : `${type}:${item?.id}`,
        disabled: isPending || isOverlay,
        data: {
            item,
            originalGroupId: groupId,
            type
        },
    })

    return (
        <div 
            ref={setNodeRef} 
            {...listeners} 
            {...attributes} 
            className={cn(
                "touch-none select-none flex w-fit transition-opacity duration-200",
                (isDragging || isOverlay) ? "cursor-grabbing" : "cursor-grab",
                isDragging && "opacity-30",
                isOverlay && "pointer-events-none"
            )}
        >
            <EditableText
                value={item?.name || defaultValue || ''}
                onChange={(newName) => onNameChange?.(item || { name: '' }, groupId, groupName, newName)}
                onCancel={onCancel}
                mode="button"
                rounded={true}
                placeholder={placeholder || (type === 'sub' ? "Sub-genre" : "Tag")}
                fontSize={12}
                fontSizeRatio={0.5}
                fontWeight="500"
                autoWidth
                allowEmpty={true}
                mainColor={color}
                darkTextColor={darkTextColor || SOFT_DARK_TEXT_COLOR}
                lightTextColor={lightTextColor || LIGHT_TEXT_COLOR}
                // Pending creation specific props
                startInEditMode={isPending}
                cancelOnBlur={isPending}
                emptyInputAtFocus={isPending && !defaultValue}
            />
        </div>
    )
}
