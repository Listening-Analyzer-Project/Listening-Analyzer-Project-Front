import { UploadCloud, X } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { importService } from "@/lib/api"
import { cn } from "@/lib/cn"
import { showErrorToast } from "@/lib/utils"
import { FUser, ImportResult } from "@/types"

function UploadArea({ user }: { user: FUser }) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(0)
  const [cumulativeResult, setCumulativeResult] = useState<ImportResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    if (isUploading === 2) {
      setIsUploading(0)
      setCumulativeResult(null)
      setProgress(0)
      setFiles(Array.from(incoming)) 
    } else {
      setFiles(prev => [...prev, ...Array.from(incoming)])
    }
  }

  const resetFiles = () => setFiles([])

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const onUploadFiles = async () => {
    if (!user) return
    if (user.syncro_status !== 0) {
      // TODO: show dialog agreee to overwrite loaded data
    }
    setIsUploading(1)
    setProgress(0)
    try {
      setCumulativeResult(await importService.uploadAndParse(files, user, (percent) => {
        setProgress(percent)
      }))
      resetFiles()
    } catch (error) {
      showErrorToast(error, "Upload failed")
    } finally {
      setIsUploading(2)
      setProgress(0)
    }
  };

  return (
    <div className="space-y-4">

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition",
          isDragging ? "border-blue-500 bg-blue-50" : "border-muted-foreground/30"
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground" />

        <p className="text-sm text-muted-foreground mt-2">
          Glissez vos fichiers ici ou cliquez pour sélectionner
        </p>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {isUploading === 1 && (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Import en cours...</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 w-full transition-all" />
        </div>
      )}

      {isUploading === 2 && (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Import terminé</span>
                <span>{cumulativeResult?.totalListens} écoutes ajoutées</span>
                <span>{cumulativeResult?.insertedAlbums} albums ajoutés</span>
                <span>{cumulativeResult?.insertedArtists} artistes ajoutés</span>
                <span>{cumulativeResult?.insertedTracks} morceaux ajoutées</span>
            </div>
        </div>
      )}

      {files.length > 0 && isUploading !== 1 && (
        <div className="space-y-2">
          <Label className="font-medium">Fichiers sélectionnés :</Label>

          <ul className="space-y-1 text-sm">
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
              >
                <span>{file.name}</span>
                <button
                  className="text-muted-foreground hover:text-red-500"
                  onClick={() =>
                    setFiles(prev => prev.filter((_, i) => i !== index))
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={resetFiles}
          disabled={files.length === 0 || isUploading !== 0}
        >
          Annuler
        </Button>

        <Button
          onClick={onUploadFiles}
          disabled={files.length === 0 || isUploading !== 0}
        >
          {isUploading === 1 ? 'Envoi...' : 'Envoyer'}
        </Button>
      </div>
    </div>
  )
}
export default UploadArea