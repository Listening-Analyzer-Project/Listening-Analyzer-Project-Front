import { Plus } from "lucide-react"
import { useMemo, useState } from "react"

import EditableText from "@/components/common/editable-text"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import {
    Card,
    CardContent,
    CardHeader
} from "@/components/ui/card"
import { genreEndpoint } from "@/lib/api/core/genre-endpoint"
import { subGenreEndpoint } from "@/lib/api/core/sub-genre-endpoint"
import { useApi } from "@/lib/hooks"
import { buildGenreColorMap } from "@/lib/utils/core-service"
import { showErrorToast, showSuccessToast } from "@/lib/utils/toasts/toast-handler"
import { FGenreWithSubGenres } from "@/types"

const BASE_COLOR_HEX = '#16A34A'
const EQU_DIST_COUNT = 8
const LUMINANCE_PRESET = 'shortList'
const SOFT_DARK_TEXT_COLOR = '#374151'

export default function GenreList() {
    const { data: genres, refetch } = useApi<FGenreWithSubGenres[]>(
        () => genreEndpoint.fetchWithSubGenres(),
        []
    )
    
    // State for pending creations
    const [isCreatingGenre, setIsCreatingGenre] = useState(false)
    const [pendingSubGenreFor, setPendingSubGenreFor] = useState<number | null>(null)
    
    // State for deleting genre
    const [genreToDelete, setGenreToDelete] = useState<FGenreWithSubGenres | null>(null)

    // State for deleting sub-genre
    const [subGenreToDelete, setSubGenreToDelete] = useState<{ id: number, name: string, genreName: string } | null>(null)

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
            showSuccessToast("Genre créé")
            refetch()
        } catch (e) {
            showErrorToast(e, "Impossible de créer le genre")
        }
    }

    const handleCancelGenreCreation = () => {
        setIsCreatingGenre(false)
    }

    const handleStartCreateSubGenre = (genreId: number) => {
        setPendingSubGenreFor(genreId)
    }

    const handlePendingSubGenreChange = async (newName: string) => {
        const genreId = pendingSubGenreFor
        setPendingSubGenreFor(null)
        if (newName.trim() === "" || !genreId) {
            return
        }
        try {
            await subGenreEndpoint.create({ 
                name: newName, 
                genre_id: genreId
            })
            showSuccessToast("Sous-genre créé")
            refetch()
        } catch (e) {
            showErrorToast(e, "Impossible de créer le sous-genre")
        }
    }

    const handleCancelSubGenreCreation = () => {
        setPendingSubGenreFor(null)
    }

    const handleGenreNameChange = async (genre: FGenreWithSubGenres, newName: string) => {
        if (newName === "") {
            setTimeout(() => {
                setGenreToDelete(genre)
            }, 50)
        } else {
            try {
                await genreEndpoint.update(genre.id!, { name: newName })
                showSuccessToast("Genre renommé")
                refetch()
            } catch (e) {
                showErrorToast(e, "Impossible de renommer le genre")
            }
        }
    }

    const handleConfirmDelete = async () => {
        if (!genreToDelete) return
        try {
            await genreEndpoint.remove(genreToDelete.id!, {})
            showSuccessToast("Genre supprimé")
            setGenreToDelete(null)
            refetch()
        } catch (e) {
            showErrorToast(e, "Impossible de supprimer le genre")
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
                showSuccessToast("Sous-genre renommé")
                refetch()
            } catch (e) {
                showErrorToast(e, "Impossible de renommer le sous-genre")
            }
        }
    }

    const handleConfirmSubGenreDelete = async () => {
        if (!subGenreToDelete) return
        try {
            await subGenreEndpoint.remove(subGenreToDelete.id)
            showSuccessToast("Sous-genre supprimé")
            setSubGenreToDelete(null)
            refetch()
        } catch (e) {
            showErrorToast(e, "Impossible de supprimer le sous-genre")
        }
    }

    // Sort genres by number of sub-genres (descending)
    const sortedGenres = useMemo(() => {
        if (!genres) return []
        return [...genres]
            .sort((a, b) => (b.sub_genres?.length || 0) - (a.sub_genres?.length || 0))
            .map(genre => ({
                ...genre,
                sub_genres: genre.sub_genres 
                    ? [...genre.sub_genres].sort((a, b) => (a.name || '').localeCompare(b.name || '')) 
                    : []
            }))
    }, [genres])

    // Build the color map for sub-genres
    const subGenreColorMap = useMemo(() => {
        return buildGenreColorMap(sortedGenres, BASE_COLOR_HEX, EQU_DIST_COUNT, LUMINANCE_PRESET)
    }, [sortedGenres])

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Liste des genres</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sortedGenres.map(genre => (
                    <Card key={genre.id} className="flex flex-col">
                        <CardHeader className="pb-2">
                            <div onClick={(e) => e.stopPropagation()}>
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
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {genre.sub_genres?.map(sub => (
                                    <EditableText
                                        key={sub.id}
                                        value={sub.name || ''}
                                        onChange={(newName) => handleSubGenreNameChange(sub, genre.id!, genre.name || '', newName)}
                                        mode="button"
                                        rounded={true}
                                        placeholder="Sub-genre"
                                        fontSize={12}
                                        fontSizeRatio={0.5}
                                        fontWeight="500"
                                        autoWidth
                                        allowEmpty={true}
                                        mainColor={sub.id ? subGenreColorMap.get(sub.id) : undefined}
                                        darkTextColor={SOFT_DARK_TEXT_COLOR}
                                    />
                                ))}

                                {/* Show pending sub-genre if creating for this genre */}
                                {pendingSubGenreFor === genre.id && (
                                    <EditableText
                                        key="pending-sub-genre"
                                        value=""
                                        onChange={handlePendingSubGenreChange}
                                        onCancel={handleCancelSubGenreCreation}
                                        mode="button"
                                        rounded={true}
                                        placeholder="Nouveau sous-genre"
                                        fontSize={12}
                                        fontSizeRatio={0.5}
                                        fontWeight="500"
                                        autoWidth
                                        allowEmpty={true}
                                        emptyInputAtFocus={true}
                                        startInEditMode={true}
                                    />
                                )}
                                
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6 rounded-full shrink-0"
                                    onClick={() => handleStartCreateSubGenre(genre.id!)}
                                >
                                    <Plus className="h-3 w-3" />
                                    <span className="sr-only">Ajouter un sous-genre</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Show pending genre if creating */}
                {isCreatingGenre && (
                    <Card className="flex flex-col">
                        <CardHeader className="pb-2">
                            <div onClick={(e) => e.stopPropagation()}>
                                <EditableText
                                    key="pending-genre"
                                    value=""
                                    onChange={handlePendingGenreChange}
                                    onCancel={handleCancelGenreCreation}
                                    mode="text"
                                    placeholder="Nouveau genre"
                                    fontSize={16}
                                    fontSizeRatio={0.65}
                                    fontWeight="600"
                                    autoWidth
                                    allowEmpty={true}
                                    emptyInputAtFocus={true}
                                    startInEditMode={true}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground italic">
                                Aucun sous-genre
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Card for creating new genre */}
                <Card className="flex flex-col cursor-pointer hover:bg-accent/50 transition-colors" onClick={handleStartCreateGenre}>
                    <CardContent className="flex-1 flex items-center justify-center min-h-[100px]">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={genreToDelete !== null} onOpenChange={(open) => !open && setGenreToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le genre ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>Attention :</strong> Cette action supprimera le genre "{genreToDelete?.name}" et tous ses sous-genres associés.
                            <br /><br />
                            Les données d'écoutes affectées à ce genre seront altérées. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={subGenreToDelete !== null} onOpenChange={(open) => !open && setSubGenreToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le sous-genre ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>Attention :</strong> Cette action supprimera le sous-genre "{subGenreToDelete?.name}" du genre "{subGenreToDelete?.genreName}".
                            <br /><br />
                            Les données d'écoutes affectées à ce sous-genre seront altérées. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmSubGenreDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
