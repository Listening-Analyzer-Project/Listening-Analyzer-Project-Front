"use client"

import EditableText from "@/components/common/editable-text"
import { useDraggable } from "@dnd-kit/core"
import React from "react"

export interface MetadataItemProps {
    item?: { id?: number; name: string }
    groupId: number
    groupName: string
    color?: string
    darkTextColor?: string
    lightTextColor?: string
    onNameChange: (item: { id?: number; name: string }, groupId: number, groupName: string, newName: string) => Promise<void>
    type: 'sub' | 'tag' // To distinguish in drag events
    // Pending mode props
    isPending?: boolean
    onCancel?: () => void
    placeholder?: string
    defaultValue?: string
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
    defaultValue
}: MetadataItemProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: isPending ? `pending-${type}-${groupId}` : `${type}:${item?.id}`,
        disabled: isPending,
        data: {
            item,
            originalGroupId: groupId,
            type
        },
    })

    // We use CSS transform for the dragging effect
    const style: React.CSSProperties = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 1000 : 1,
        position: isDragging ? 'relative' : undefined,
    } : {}

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes} 
            className="touch-none select-none"
        >
            <EditableText
                value={item?.name || defaultValue || ''}
                onChange={(newName) => onNameChange(item || { name: '' }, groupId, groupName, newName)}
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
