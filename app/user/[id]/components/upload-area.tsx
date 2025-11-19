import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/cn"
import { UploadCloud, X } from "lucide-react"
import { importService } from "@/lib/api"

function UploadArea({ userId }: { userId: number | undefined }) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
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

  const onUploadFiles = () => {
    if (!userId) return // TODO: gérer l'erreur
    importService.uploadAndParse(files, userId)
    resetFiles()
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
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
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
          disabled={files.length === 0}
        >
          Annuler
        </Button>

        <Button
          onClick={onUploadFiles}
          disabled={files.length === 0}
        >
          Envoyer
        </Button>
      </div>
    </div>
  )
}
export default UploadArea