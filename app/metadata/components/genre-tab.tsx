import {
    closestCorners,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

import {
    Card,
    CardContent,
    CardHeader
} from "@/components/ui/card"

import { genreEndpoint } from "@/lib/api/core/genre-endpoint"
import { subGenreEndpoint } from "@/lib/api/core/sub-genre-endpoint"
import { useApi } from "@/lib/hooks"

import { getCyclicColor } from "@/lib/utils"
import { buildGenreColorMap } from "@/lib/utils/core-service"
import { showErrorToast, showSuccessToast } from "@/lib/utils/toasts/toast-handler"

import { FGenreWithSubGenres, FSubGenre } from "@/types"

import EditableText from "@/components/common/editable-text"
import DeletionDialog from "@/components/common/others/deletion-dialog"
import {
    MetadataGroup
} from "./shared/metadata-group"
import { MetadataItem } from "./shared/metadata-item"

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortList'

export default function GenreTab() {
    const { data: genres, refetch } = useApi<FGenreWithSubGenres[]>(
        () => genreEndpoint.fetchWithSubGenres(),
    )

    // Order state to defer sorting until refresh
    const [displayOrder, setDisplayOrder] = useState<{
        genreIds: number[],
        subGenreIdsByGenre: Record<number, number[]>
    } | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        })
    )

    // State for pending creations
    const [isCreatingGenre, setIsCreatingGenre] = useState(false)
    const [pendingSubGenre, setPendingSubGenre] = useState<number | null>(null)
    
    // State for deleting genre
    const [genreToDelete, setGenreToDelete] = useState<FGenreWithSubGenres | null>(null)

    // State for deleting sub-genre
    const [subGenreToDelete, setSubGenreToDelete] = useState<{ id: number, name: string, genreName: string } | null>(null)

    // Calculate next numbers for default names
    const nextGenreNumber = (genres?.length || 0) + 1

    useEffect(() => {
        if (!genres || displayOrder) return

        const sorted = [...genres].sort((a, b) => {
            const diff = (b.sub_genres?.length || 0) - (a.sub_genres?.length || 0)
            if (diff !== 0) return diff
            return (a.name || '').localeCompare(b.name || '')
        })

        const genreIds = sorted.map(g => g.id!)
        const subGenreIdsByGenre: Record<number, number[]> = {}
        
        sorted.forEach(g => {
            subGenreIdsByGenre[g.id!] = (g.sub_genres || [])
                .sort((a, b) => {
                    const nameA = a.name || ''
                    const nameB = b.name || ''
                    if (nameA === 'Other') return 1
                    if (nameB === 'Other') return -1
                    return nameA.localeCompare(nameB)
                })
                .map(s => s.id!)
        })

        setDisplayOrder({ genreIds, subGenreIdsByGenre })
    }, [genres, displayOrder])

    // Compute the visual list based on preserved order + new items
    const sortedGenres = useMemo(() => {
        if (!genres) return []
        if (!displayOrder) return genres // Fallback before first displayOrder is set

        const genreMap = new Map(genres.map(g => [g.id, g]))
        
        // 1. Process known genres in preserved order
        const orderedGenres = displayOrder.genreIds
            .map(id => genreMap.get(id))
            .filter((g): g is FGenreWithSubGenres => !!g)

        // 2. Identify new genres (added since last refresh)
        const knownGenreIds = new Set(displayOrder.genreIds)
        const newGenres = genres.filter(g => !knownGenreIds.has(g.id!))
        
        const allGenres = [...orderedGenres, ...newGenres]

        return allGenres.map(genre => {
            const preservedSubIds = displayOrder.subGenreIdsByGenre[genre.id!] || []
            const subMap = new Map(genre.sub_genres?.map(s => [s.id, s]) || [])
            
            // a. Preserved sub-genres in order
            const orderedSubs = preservedSubIds
                .map(id => subMap.get(id))
                .filter((s): s is FSubGenre => !!s)
                
            // b. New sub-genres (added or moved here)
            const knownSubIds = new Set(preservedSubIds)
            const newSubs = (genre.sub_genres || []).filter(s => !knownSubIds.has(s.id!))

            return {
                ...genre,
                sub_genres: [...orderedSubs, ...newSubs]
            }
        })
    }, [genres, displayOrder])

    // Build the color map for sub-genres
    const subGenreColorMap = useMemo(() => {
        return buildGenreColorMap(sortedGenres, BASE_COLOR_HEX, EQU_DIST_COUNT, LUMINANCE_PRESET)
    }, [sortedGenres])

    const handleStartCreateGenre = () => {
        setIsCreatingGenre(true)
    }

    const handlePendingGenreChange = async (newName: string) => {
        setIsCreatingGenre(false)
        if (newName.trim() === "") {
            return
        }
        try {
            await genreEndpoint.create({ name: newName })
            showSuccessToast("Genre created")
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to create genre")
        }
    }

    const handlePendingSubGenreChange = async (newName: string) => {
        const genreId = pendingSubGenre
        setPendingSubGenre(null)
        if (newName.trim() === "" || !genreId) {
            return
        }
        try {
            await subGenreEndpoint.create({ 
                name: newName, 
                genre_id: genreId
            })
            showSuccessToast("Sub-genre created")
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to create sub-genre")
        }
    }

    const handleGenreNameChange = async (genre: FGenreWithSubGenres, newName: string) => {
        if (newName === "") {
            setTimeout(() => {
                setGenreToDelete(genre)
            }, 50)
        } else {
            try {
                await genreEndpoint.update(genre.id!, { name: newName })
                showSuccessToast("Genre renamed")
                refetch()
            } catch (e) {
                showErrorToast(e, "Failed to rename genre")
            }
        }
    }

    const handleConfirmDelete = async () => {
        if (!genreToDelete) return
        try {
            await genreEndpoint.remove(genreToDelete.id!, {})
            showSuccessToast("Genre deleted")
            setGenreToDelete(null)
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to delete genre")
        }
    }

    const handleSubGenreNameChange = async (subGenre: { id?: number, name: string }, genreId: number, genreName: string, newName: string) => {
        if (newName === "") {
            setTimeout(() => {
                setSubGenreToDelete({ id: subGenre.id!, name: subGenre.name, genreName })
            }, 50)
        } else {
            try {
                await subGenreEndpoint.update(subGenre.id!, { 
                    name: newName,
                    genre_id: genreId
                })
                showSuccessToast("Sub-genre renamed")
                refetch()
            } catch (e) {
                showErrorToast(e, "Failed to rename sub-genre")
            }
        }
    }

    const handleConfirmSubGenreDelete = async () => {
        if (!subGenreToDelete) return
        try {
            await subGenreEndpoint.remove(subGenreToDelete.id)
            showSuccessToast("Sub-genre deleted")
            setSubGenreToDelete(null)
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to delete sub-genre")
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const activeData = active.data.current
        const overGenreId = parseInt(String(over.id).split(":")[1])
        const item = activeData?.item
        const originalGroupId = activeData?.originalGroupId

        if (item && overGenreId !== originalGroupId) {
            try {
                await subGenreEndpoint.update(item.id, {
                    genre_id: overGenreId,
                    name: item.name // Keep name same, endpoint might require it or it's good practice
                })
                showSuccessToast(`${item.name} moved`)
                refetch()
            } catch (e) {
                showErrorToast(e, "Failed to move sub-genre")
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">List of Genres</h2>
                <p className="text-muted-foreground text-sm">
                    Manage musical genres and sub-genres.
                </p>
            </div>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start" style={{ overflowAnchor: 'none' }}>
                    {sortedGenres.map((genre, idx) => {
                        const genreColor = getCyclicColor(BASE_COLOR_HEX, EQU_DIST_COUNT, LUMINANCE_PRESET, idx + 1)
                        
                        return (
                        <MetadataGroup
                            key={genre.id}
                            id={`genre:${genre.id}`}
                            groupColor={genreColor}
                            header={
                                <>
                                    <div 
                                        className="w-full h-1 rounded-t-xl"
                                        style={{ backgroundColor: genreColor }}
                                    />
                                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                        <div onClick={(e) => e.stopPropagation()} className="flex-1">
                                            <EditableText
                                                value={genre.name || ''}
                                                onChange={(newName) => handleGenreNameChange(genre, newName)}
                                                mode="text"
                                                placeholder="Genre name"
                                                fontSize={16}
                                                fontSizeRatio={0.65}
                                                fontWeight="600"
                                                autoWidth
                                                allowEmpty={true}
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGenreToDelete(genre);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardHeader>
                                </>
                            }
                            onAddItem={() => setPendingSubGenre(genre.id!)}
                            addItemLabel="Add sub-genre"
                            pendingItem={pendingSubGenre === genre.id ? (
                                <MetadataItem
                                    isPending={true}
                                    type="sub"
                                    groupId={genre.id!}
                                    groupName={genre.name || ''}
                                    color={genreColor}
                                    onNameChange={async (_, gId, __, newName) => handlePendingSubGenreChange(newName)}
                                    onCancel={() => setPendingSubGenre(null)}
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
                                    onNameChange={handleSubGenreNameChange}
                                />
                            ))}
                        </MetadataGroup>
                    )})}
                    {isCreatingGenre && (
                        <Card className="flex flex-col">
                            <CardHeader className="p-4 pb-2">
                                <div onClick={(e) => e.stopPropagation()}>
                                    <EditableText
                                        key="pending-genre"
                                        value={`Genre ${nextGenreNumber}`}
                                        onChange={handlePendingGenreChange}
                                        onCancel={() => setIsCreatingGenre(false)}
                                        mode="text"
                                        placeholder="New genre"
                                        fontSize={16}
                                        fontSizeRatio={0.65}
                                        fontWeight="600"
                                        autoWidth
                                        allowEmpty={true}
                                        startInEditMode={true}
                                        cancelOnBlur={true}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 pt-0 flex-1">
                                <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground italic">
                                    No sub-genres
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="flex flex-col cursor-pointer hover:bg-accent/50 transition-colors border-dashed" onClick={handleStartCreateGenre}>
                        <CardContent className="flex-1 flex items-center justify-center min-h-[80px] p-2">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                            <span className="sr-only">Add</span>
                        </CardContent>
                    </Card>
                </div>
            </DndContext>

            <DeletionDialog 
                open={genreToDelete !== null} 
                onOpenChange={(open) => !open && setGenreToDelete(null)}
                title="Delete genre ?"
                description={
                    <>
                        <strong>Warning:</strong> This action will delete the genre "{genreToDelete?.name}" and all its associated sub-genres.
                        <br /><br />
                        Listening data assigned to this genre will be affected. This action is irreversible.
                    </>
                }
                onConfirm={handleConfirmDelete}
            />

            <DeletionDialog 
                open={subGenreToDelete !== null} 
                onOpenChange={(open) => !open && setSubGenreToDelete(null)}
                title="Delete sub-genre ?"
                description={
                    <>
                        <strong>Warning:</strong> This action will delete the sub-genre "{subGenreToDelete?.name}" from genre "{subGenreToDelete?.genreName}".
                        <br /><br />
                        Listening data assigned to this sub-genre will be affected. This action is irreversible.
                    </>
                }
                onConfirm={handleConfirmSubGenreDelete}
            />
        </div>
    )
}


