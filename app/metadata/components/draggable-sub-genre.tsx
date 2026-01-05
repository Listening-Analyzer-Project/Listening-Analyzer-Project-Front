"use client"

import EditableText from "@/components/common/editable-text"
import { FSubGenre } from "@/types"
import { useDraggable } from "@dnd-kit/core"
import React from "react"

interface DraggableSubGenreProps {
  sub: FSubGenre
  genreId: number
  genreName: string
  color?: string
  darkTextColor?: string
  onNameChange: (subGenre: { id?: number; name: string }, genreId: number, genreName: string, newName: string) => Promise<void>
}

export function DraggableSubGenre({ sub, genreId, genreName, color, darkTextColor, onNameChange }: DraggableSubGenreProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sub:${sub.id}`,
    data: {
      sub,
      originalGenreId: genreId,
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
        value={sub.name || ''}
        onChange={(newName) => onNameChange(sub, genreId, genreName, newName)}
        mode="button"
        rounded={true}
        placeholder="Sub-genre"
        fontSize={12}
        fontSizeRatio={0.5}
        fontWeight="500"
        autoWidth
        allowEmpty={true}
        mainColor={color}
        darkTextColor={darkTextColor}
      />
    </div>
  )
}
