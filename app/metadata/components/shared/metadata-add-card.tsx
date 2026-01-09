import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"

interface MetadataAddCardProps {
    onClick: () => void
    label?: string
}

export function MetadataAddCard({ onClick, label = "Ajouter" }: MetadataAddCardProps) {
    return (
        <Card className="flex flex-col cursor-pointer hover:bg-accent/50 transition-colors border-dashed" onClick={onClick}>
            <CardContent className="flex-1 flex items-center justify-center min-h-[80px] p-2">
                <Plus className="h-8 w-8 text-muted-foreground" />
                <span className="sr-only">{label}</span>
            </CardContent>
        </Card>
    )
}
