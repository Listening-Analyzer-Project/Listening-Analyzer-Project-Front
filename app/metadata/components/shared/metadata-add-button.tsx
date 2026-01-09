import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface MetadataAddButtonProps {
    onClick: () => void
    label?: string
    className?: string
}

export function MetadataAddButton({ onClick, label = "Ajouter", className }: MetadataAddButtonProps) {
    return (
        <Button
            size="icon"
            variant="ghost"
            // Unified style: dashed border for implicit "add" action, round shape
            className={cn("h-6 w-6 rounded-full shrink-0 border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent", className)}
            onClick={onClick}
        >
            <Plus className="h-3 w-3" />
            <span className="sr-only">{label}</span>
        </Button>
    )
}
