"use client"

import EditableText from "@/components/common/editable-text"
import { useDraggable } from "@dnd-kit/core"
import React from "react"

export interface MetadataItemProps {
  item: { id?: number; name: string }
  groupId: number
  groupName: string
  color?: string
  darkTextColor?: string
  lightTextColor?: string
  onNameChange: (item: { id?: number; name: string }, groupId: number, groupName: string, newName: string) => Promise<void>
  type: 'sub' | 'tag' // To distinguish in drag events
}

export function MetadataItem({ item, groupId, groupName, color, darkTextColor, lightTextColor, onNameChange, type }: MetadataItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${type}:${item.id}`,
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
        value={item.name || ''}
        onChange={(newName) => onNameChange(item, groupId, groupName, newName)}
        mode="button"
        rounded={true}
        placeholder={type === 'sub' ? "Sub-genre" : "Tag"}
        fontSize={12}
        fontSizeRatio={0.5}
        fontWeight="500"
        autoWidth
        allowEmpty={true}
        mainColor={color}
        darkTextColor={darkTextColor}
        lightTextColor={lightTextColor}
      />
    </div>
  )
}
