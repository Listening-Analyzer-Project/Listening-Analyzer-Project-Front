"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetadataGroupProps {
    id: string
    groupColor: string
    header: ReactNode
    children: ReactNode
    pendingItem?: ReactNode
    onAddItem: () => void
    addItemLabel: string
    onMouseEnter?: () => void
    onMouseLeave?: () => void
}

export function MetadataGroup({
    id,
    groupColor,
    header,
    children,
    pendingItem,
    onAddItem,
    addItemLabel,
    onMouseEnter,
    onMouseLeave
}: MetadataGroupProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    })

    return (
        <div 
            ref={setNodeRef} 
            className={cn("transition-colors rounded-xl relative", isOver && "ring-2 ring-primary/30")}
            style={{ 
                backgroundColor: isOver 
                    ? (groupColor ? `${groupColor}10` : 'hsl(var(--primary) / 0.05)') 
                    : 'transparent' 
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Card className="flex flex-col group transition-colors h-full overflow-hidden">
                {header}
                <CardContent className="px-4 pb-4 pt-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {children}
                        
                        {pendingItem}
                        
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-full shrink-0 border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent"
                            onClick={onAddItem}
                        >
                            <Plus className="h-3 w-3" />
                            <span className="sr-only">{addItemLabel}</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
