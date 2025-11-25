import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React from 'react'

export default function SortableItem({
  id,
  children,
  depth = 0,
  disabled = false,
}: {
  id: string
  children: React.ReactNode
  depth?: number
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start">
        <div className="flex-1 min-w-0" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          {children}
        </div>
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag user"
          className="p-1 ml-2 rounded hover:bg-gray-100 mt-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M10 6h4M10 12h4M10 18h4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
