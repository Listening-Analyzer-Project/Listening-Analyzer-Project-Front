import { Card, CardContent } from "@/components/ui/card"
import { ReactNode } from "react"
import { DroppableMetadataContainer } from "./droppable-metadata-container"
import { MetadataAddButton } from "./metadata-add-button"

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
                        
                        <MetadataAddButton
                            onClick={onAddItem}
                            label={addItemLabel}
                        />
                    </div>
                </CardContent>
            </Card>
        </DroppableMetadataContainer>
    )
}
