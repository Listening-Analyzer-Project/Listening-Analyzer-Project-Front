"use client"

import { Plus } from "lucide-react"
import { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { DroppableMetadataContainer } from "./droppable-metadata-container"

interface MetadataGroupProps {
    id: string
    groupColor: string // For the droppable overlay
    header: ReactNode
    children: ReactNode // The list of items (MetadataItems)
    pendingItem?: ReactNode
    onAddItem: () => void
    addItemLabel: string
}

export function MetadataGroup({
    id,
    groupColor,
    header,
    children,
    pendingItem,
    onAddItem,
    addItemLabel
}: MetadataGroupProps) {
    return (
        <DroppableMetadataContainer 
            id={id} 
            className="ring-primary/30" 
            bgOverlayColor={groupColor}
        >
            <Card className="flex flex-col group transition-colors h-full">
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
        </DroppableMetadataContainer>
    )
}
