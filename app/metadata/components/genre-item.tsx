import { Trash2 } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import EditableText from "@/components/common/editable-text"
import { Button } from "@/components/ui/button"

import { darkenColor } from "@/lib/utils"
import { FGenreWithSubGenres } from "@/types"
import { MetadataGroup } from "./shared/metadata-group"
import { MetadataItem } from "./shared/metadata-item"

interface GenreItemProps {
    genre: FGenreWithSubGenres
    genreColor: string
    subGenreColorMap: Map<number, string>
    onRename: (genre: FGenreWithSubGenres, newName: string) => void
    onDelete: (genre: FGenreWithSubGenres) => void
    pendingSubGenre: number | null
    onAddSubGenre: (genreId: number) => void
    onPendingSubGenreChange: (newName: string) => Promise<void>
    onCancelPendingSubGenre: () => void
    onSubGenreRename: (subGenre: { id?: number, name: string }, genreId: number, genreName: string, newName: string) => Promise<void>
    setSubGenreToDelete: (subGenre: { id: number, name: string, genreName: string }) => void
}

export function GenreItem({
    genre,
    genreColor,
    subGenreColorMap,
    onRename,
    onDelete,
    pendingSubGenre,
    onAddSubGenre,
    onPendingSubGenreChange,
    onCancelPendingSubGenre,
    onSubGenreRename,
    setSubGenreToDelete
}: GenreItemProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isTrashHovered, setIsTrashHovered] = useState(false)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const darkenedColor = useMemo(() => darkenColor(genreColor, 10), [genreColor])

    const handleMouseEnter = () => {
        // Delay setting hover state to allow the background transition to start
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true)
        }, 150) 
    }

    const handleMouseLeave = () => {
        // Clear any pending timeout and reset immediately
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        setIsHovered(false)
    }

    return (
        <MetadataGroup
            id={`genre:${genre.id}`}
            groupColor={genreColor}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            header={
                <div className="relative transition-all duration-300 ease-in-out">
                    <div 
                        className="absolute top-0 left-0 w-full h-1 transition-all duration-300 ease-in-out group-hover:h-full"
                        style={{ backgroundColor: genreColor }}
                    />
                    <div className="relative z-10 p-4 pb-2 flex flex-row items-center justify-between space-y-0 transition-colors duration-200 group-hover:text-white">
                        <div onClick={(e) => e.stopPropagation()} className="flex-1">
                            <EditableText
                                value={genre.name || ''}
                                onChange={(newName) => onRename(genre, newName)}
                                mode={isHovered ? "button" : "text"}
                                mainColor={isHovered ? genreColor : undefined}
                                placeholder="Genre name"
                                fontSize={16}
                                fontSizeRatio={0.65}
                                fontWeight="600"
                                autoWidth
                                allowEmpty={true}
                                lightTextColor="#ffffff"
                            />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-white"
                            style={{ 
                                backgroundColor: isTrashHovered ? darkenedColor : 'transparent' 
                            }}
                            onMouseEnter={() => setIsTrashHovered(true)}
                            onMouseLeave={() => setIsTrashHovered(false)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(genre);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            }
            onAddItem={() => onAddSubGenre(genre.id!)}
            addItemLabel="Add sub-genre"
            pendingItem={pendingSubGenre === genre.id ? (
                <MetadataItem
                    isPending={true}
                    type="sub"
                    groupId={genre.id!}
                    groupName={genre.name || ''}
                    color={genreColor}
                    onNameChange={async (_, gId, __, newName) => onPendingSubGenreChange(newName)}
                    onCancel={onCancelPendingSubGenre}
                    placeholder="New subgenre"
                    defaultValue={`Subgenre ${(genre.sub_genres?.length || 0) + 1}`}
                />
            ) : undefined}
        >
            {genre.sub_genres?.map(sub => (
                <MetadataItem
                    key={sub.id}
                    type="sub"
                    item={sub}
                    groupId={genre.id!}
                    groupName={genre.name || ''}
                    color={sub.id ? subGenreColorMap.get(sub.id) : undefined}
                    onNameChange={onSubGenreRename}
                />
            ))}
        </MetadataGroup>
    )
}
