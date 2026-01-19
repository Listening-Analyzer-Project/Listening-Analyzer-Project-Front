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
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

import { tagEndpoint } from "@/lib/api/core/tag-endpoints"
import { useApi } from "@/lib/hooks"

import { darkenColor } from "@/lib/utils"
import { buildTagColorMap, getTagGroupColor } from "@/lib/utils/core-service"
import { showErrorToast, showSuccessToast } from "@/lib/utils/toasts/toast-handler"
import { FTag } from "@/types"

import DeletionDialog from "@/components/common/others/deletion-dialog"
import {
    MetadataGroup
} from "./shared/metadata-group"
import { MetadataItem } from "./shared/metadata-item"

export default function TagTab() {
    const { data: tags, refetch, setData: setTags } = useApi<FTag[]>(
        () => tagEndpoint.fetchAll(),
    )

    const [hoveredTrashIdx, setHoveredTrashIdx] = useState<number | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        })
    )

    // State for max group index visible (to allow adding new empty groups)
    const [maxVisibleIndex, setMaxVisibleIndex] = useState(0)

    // Order state to defer sorting until refresh
    const [displayOrder, setDisplayOrder] = useState<{
        groupIds: number[],
        tagIdsByGroup: Record<number, number[]>
    } | null>(null)

    // States for interaction
    const [pendingCreateIn, setPendingCreateIn] = useState<number | null>(null)
    const [tagToDelete, setTagToDelete] = useState<FTag | null>(null)
    const [groupToDelete, setGroupToDelete] = useState<number | null>(null)

    useEffect(() => {
        if (!tags || displayOrder) return

        // Initial grouping and sorting
        const groups = new Map<number, FTag[]>()
        tags.forEach(tag => {
            const idx = tag.color_index
            if (!groups.has(idx)) groups.set(idx, [])
            groups.get(idx)?.push(tag)
        })

        const groupIds = Array.from(groups.keys()).sort((a, b) => a - b)
        
        // Group 0 always last
        const tagIdsByGroup: Record<number, number[]> = {}
        groups.forEach((groupTags, idx) => {
             tagIdsByGroup[idx] = groupTags
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(t => t.id!)
        })

        setDisplayOrder({ groupIds, tagIdsByGroup })
    }, [tags, displayOrder])

    // Update maxVisibleIndex when tags change, ensuring we show at least up to the highest existing index
    useEffect(() => {
        if (!tags) return
        let max = 0
        tags.forEach(t => {
            if (t.color_index > max) max = t.color_index
        })
        setMaxVisibleIndex(prev => Math.max(prev, max))
    }, [tags])

    // Compute the visual list based on preserved order + new items
    const groupedTags = useMemo(() => {
         const groups = new Map<number, FTag[]>()
         if (!tags) return groups
         
         if (!displayOrder) {
             // Fallback: standard immediate sort
             tags.forEach(tag => {
                const idx = tag.color_index
                if (!groups.has(idx)) groups.set(idx, [])
                groups.get(idx)?.push(tag)
            })
            groups.forEach(group => {
                group.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            })
            return groups
         }

         const tagMap = new Map(tags.map(t => [t.id, t]))
         
         // Reconstruct groups based on displayOrder
         const allIndices = new Set([...displayOrder.groupIds, ...tags.map(t => t.color_index)])
         
         allIndices.forEach(idx => {
             const preservedTagIds = displayOrder.tagIdsByGroup[idx] || []
             
             // a. Preserved tags in order
             const orderedTags = preservedTagIds
                .map(id => tagMap.get(id))
                .filter((t): t is FTag => !!t && t.color_index === idx) // Verify it's still in this group
             
             const currentTagsInGroup = tags.filter(t => t.color_index === idx)
             const knownTagIds = new Set(orderedTags.map(t => t.id!))
             
             const newTags = currentTagsInGroup.filter(t => !knownTagIds.has(t.id!))
             
             // Combine: Ordered + New (appended)
             groups.set(idx, [...orderedTags, ...newTags])
         })

         return groups
    }, [tags, displayOrder])

    const tagColorMap = useMemo(() => {
        return buildTagColorMap(groupedTags)
    }, [groupedTags])

    // List of indices to render
    const indices = useMemo(() => {
        const result = []
        for (let i = 1; i <= maxVisibleIndex; i++) {
            result.push(i)
        }
        // Only append 0 if there are tags in it
        if ((groupedTags.get(0)?.length || 0) > 0) {
            result.push(0)
        }
        return result
    }, [maxVisibleIndex, groupedTags])

    const handlePendingTagChange = async (newName: string) => {
        const index = pendingCreateIn
        setPendingCreateIn(null)
        if (newName.trim() === "" || index === null) return

        try {
            await tagEndpoint.create({
                name: newName,
                color_index: index
            })
            showSuccessToast("Tag created")
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to create tag")
        }
    }

    const handleTagNameChange = async (tag: {id?: number, name: string}, groupId: number, groupName: string, newName: string) => {
         if (newName === "") {
            setTimeout(() => {
                // Must find the original tag object to delete
                const original = tags?.find(t => t.id === tag.id)
                if (original) setTagToDelete(original)
            }, 50)
        } else {
             try {
                // Optimistic Update
                setTags(prev => prev ? prev.map(t => t.id === tag.id ? { ...t, name: newName } : t) : prev)

                await tagEndpoint.update(tag.id!, {
                    name: newName,
                    color_index: groupId
                })
                showSuccessToast("Tag renamed")
                refetch()
            } catch (e) {
                // Rollback on error
                refetch()
                showErrorToast(e, "Failed to rename tag")
            }
        }
    }

    const handleConfirmDeleteTag = async () => {
        if (!tagToDelete) return
        try {
            await tagEndpoint.remove(tagToDelete.id!)
            showSuccessToast("Tag deleted")
            setTagToDelete(null)
            refetch()
        } catch (e) {
            showErrorToast(e, "Failed to delete tag")
        }
    }

    //TODO: Ne fonctionne pas
    const handleConfirmDeleteGroup = async () => {
        if (groupToDelete === null) return
        
        // 1. Delete all tags in this group
        // 2. Shift indices > groupToDelete
        const tagsInGroup = groupedTags.get(groupToDelete) || []
        const tagsToShift = (tags || []).filter(t => t.color_index > groupToDelete)

        try {
             await Promise.all(tagsInGroup.map(t => tagEndpoint.remove(t.id!)))

            // Shift others
            for (const t of tagsToShift) {
                await tagEndpoint.update(t.id!, {
                    name: t.name,
                    color_index: t.color_index - 1
                })
            }

            showSuccessToast(`Group ${groupToDelete} deleted`)
            setGroupToDelete(null)
            
            // Reduce max visible index if it was the last one
            if (groupToDelete === maxVisibleIndex) {
                 setMaxVisibleIndex(prev => Math.max(0, prev - 1))
            } else {
                 // Actually we just reduced the count of groups effectively
                 setMaxVisibleIndex(prev => Math.max(0, prev - 1))
            }
            
            refetch()

        } catch (e) {
            showErrorToast(e, "Failed to delete group")
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const activeData = active.data.current
        const overGroupId = parseInt(String(over.id).split(":")[1])
        const item = activeData?.item
        const originalGroupId = activeData?.originalGroupId

        if (item && overGroupId !== originalGroupId) {
            try {
                await tagEndpoint.update(item.id, {
                    color_index: overGroupId,
                    name: item.name 
                })
                showSuccessToast("Tag moved")
                refetch()
            } catch (e) {
                showErrorToast(e, "Failed to move tag")
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">List of Tags</h2>
                <p className="text-muted-foreground text-sm">
                    Manage tags and tag groups.
                </p>
            </div>

             <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start" style={{ overflowAnchor: 'none' }}>
                    {indices.map(idx => {
                        const color = getTagGroupColor(idx)
                        const groupTags = groupedTags.get(idx) || []
                        const isDefault = idx === 0

                        return (
                            <MetadataGroup
                                key={idx}
                                id={`group:${idx}`}
                                groupColor={color}
                                header={
                                     <div 
                                        className="w-full h-1 transition-all duration-300 ease-in-out group-hover:h-9"
                                        style={{ backgroundColor: color }}
                                    >
                                         {!isDefault && (
                                             <div className="flex h-full items-center justify-end px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-white hover:text-white"
                                                    style={{ 
                                                        backgroundColor: hoveredTrashIdx === idx ? darkenColor(color, 10) : 'transparent' 
                                                    }}
                                                    onMouseEnter={() => setHoveredTrashIdx(idx)}
                                                    onMouseLeave={() => setHoveredTrashIdx(null)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGroupToDelete(idx);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                }
                                onAddItem={() => setPendingCreateIn(idx)}
                                addItemLabel="Add tag"
                                pendingItem={pendingCreateIn === idx ? (
                                    <MetadataItem
                                        isPending={true}
                                        type="tag"
                                        groupId={idx}
                                        groupName={isDefault ? 'Uncategorized' : `Group ${idx}`}
                                        color={color}
                                        onNameChange={async (_, gId, __, newName) => handlePendingTagChange(newName)}
                                        onCancel={() => setPendingCreateIn(null)}
                                        placeholder="New tag"
                                        defaultValue={`Tag ${(groupTags.length || 0) + 1}`}
                                    />
                                ) : undefined}
                            >
                                {groupTags.map(tag => (
                                    <MetadataItem
                                        key={tag.id}
                                        type="tag"
                                        item={tag}
                                        groupId={idx}
                                        groupName={isDefault ? 'Uncategorized' : `Group ${idx}`}
                                        color={tag.id ? tagColorMap.get(tag.id) : undefined}
                                        onNameChange={handleTagNameChange}
                                    />
                                ))}
                            </MetadataGroup>
                        )
                    })}
                    
                    <Card className="flex flex-col cursor-pointer hover:bg-accent/50 transition-colors border-dashed" onClick={() => setMaxVisibleIndex(prev => prev + 1)}>
                        <CardContent className="flex-1 flex items-center justify-center min-h-[80px] p-2">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                            <span className="sr-only">Add</span>
                        </CardContent>
                    </Card>
                </div>
            </DndContext>

            <DeletionDialog 
                open={tagToDelete !== null} 
                onOpenChange={(open) => !open && setTagToDelete(null)}
                title="Delete tag ?"
                description={
                    <>
                        <strong>Warning:</strong> This action will delete the tag "{tagToDelete?.name}".
                        <br /><br />
                        This action is irreversible.
                    </>
                }
                onConfirm={handleConfirmDeleteTag}
            />

            <DeletionDialog 
                open={groupToDelete !== null} 
                onOpenChange={(open) => !open && setGroupToDelete(null)}
                title={`Delete group ${groupToDelete} ?`}
                description={
                    <>
                        <strong>Warning:</strong> This action will delete all tags in this group and shift subsequent groups.
                        <br /><br />
                        This action is irreversible.
                    </>
                }
                onConfirm={handleConfirmDeleteGroup}
            />
        </div>
    )
}

