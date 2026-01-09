import { cn } from "@/lib/utils"
import { useDroppable } from "@dnd-kit/core"

interface DroppableMetadataContainerProps {
    id: string | number
    children: React.ReactNode
    data?: Record<string, any>
    bgOverlayColor?: string // Defines the color of the background overlay when dragging over
    className?: string
}

export function DroppableMetadataContainer({ id, children, data, bgOverlayColor, className }: DroppableMetadataContainerProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data
    })

    return (
        <div 
            ref={setNodeRef} 
            className={cn("transition-colors rounded-xl relative", isOver && "ring-2 ring-primary/30", className)}
            style={{ 
                backgroundColor: isOver && bgOverlayColor ? `${bgOverlayColor}10` : isOver ? 'rgba(var(--primary), 0.05)' : 'transparent' 
            }}
        >
            {children}
        </div>
    )
}
