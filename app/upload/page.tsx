"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileUp,
  Trash2,
  UploadIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface ImportResult {
  success: boolean;
  summary: {
    totalProcessed: number;
    totalValid: number;
    totalFiltered: number;
    totalErrors: number;
    totalListensCreated: number;
    filesProcessed: number;
  };
  errors: string[];
}

export default function UploadPage() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  /* ---------- handlers ---------- */
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
    setMessage(
      files.length > 0 ? `${files.length} fichier(s) JSON sélectionné(s).` : ""
    );
    setProgress(0);
    setImportResult(null);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);

    // Filtrer seulement les fichiers JSON
    const jsonFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".json")
    );

    if (jsonFiles.length === 0) {
      setMessage("Veuillez sélectionner des fichiers JSON uniquement.");
      return;
    }

    setSelectedFiles(jsonFiles);
    setMessage(`${jsonFiles.length} fichier(s) JSON sélectionné(s).`);
    setProgress(0);
    setImportResult(null);
  }

  async function handleImportClick() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage("Veuillez d'abord sélectionner des fichiers JSON.");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setMessage("Lecture des fichiers...");
    setImportResult(null);

    try {
      // Lire tous les fichiers
      const files = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setMessage(
          `Lecture du fichier ${i + 1}/${selectedFiles.length}: ${file.name}`
        );

        try {
          const content = await readFileAsText(file);
          files.push({
            name: file.name,
            content: content,
          });
        } catch (fileError) {
          console.error(`Erreur lecture fichier ${file.name}:`, fileError);
          setMessage(`Erreur lors de la lecture du fichier ${file.name}`);
          continue;
        }
      }

      if (files.length === 0) {
        throw new Error("Aucun fichier n'a pu être lu correctement");
      }

      setMessage("Import des données en cours...");

      // STREAMING: Utiliser la version DEBUG pour identifier le problème
      const response = await fetch("/api/import/spotify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Pas de réponse streaming disponible");
      }

      // STREAMING: Lire la réponse en streaming avec gestion d'erreur améliorée
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim().startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // Mettre à jour la progression - SIMPLE !
                if (data.type === "progress") {
                  setProgress(data.progress || 0);
                  setMessage(data.message || "Import en cours...");
                  console.log("PROGRESS:", data.message, data.progress); // AJOUTÉ
                }

                // Résultat final
                if (data.type === "complete") {
                  setProgress(100);
                  setImportResult(data.result);
                  setMessage("Import terminé avec succès !");
                  console.log("COMPLETE:", data.result); // AJOUTÉ
                }

                // Gestion des erreurs
                if (data.type === "error") {
                  throw new Error(data.message || "Erreur inconnue");
                  console.error("ERROR:", data.message); // AJOUTÉ
                }
              } catch (parseError) {
                console.log("Ligne non-JSON ignorée:", line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error("Erreur d'import:", error);
      setMessage(`Erreur: ${error.message}`);
      setImportResult(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleClearDatabase() {
    // The confirm dialog will now be handled by AlertDialog, so remove the browser confirm
    // if (
    //   !confirm(
    //     "⚠️ ATTENTION ! Cela va supprimer TOUTES les données de la base (sauf tables de référence). Êtes-vous sûr ?",
    //   )
    // ) {
    //   return
    // }

    setIsUploading(true);
    setMessage("Vidage de la base de données...");
    setProgress(0);

    try {
      const response = await fetch("/api/clear-database", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors du vidage");
      }

      setProgress(100);
      setMessage("Base de données vidée avec succès !");
      setImportResult(null);
    } catch (error: any) {
      console.error("Erreur de vidage:", error);
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("Résultat de lecture invalide"));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Erreur de lecture du fichier: ${file.name}`));
      };

      reader.onabort = () => {
        reject(new Error(`Lecture du fichier interrompue: ${file.name}`));
      };

      try {
        reader.readAsText(file);
      } catch (error) {
        reject(new Error(`Impossible de lire le fichier: ${file.name}`));
      }
    });
  }

  /* ---------- render ---------- */
  return (
    <div className="container mx-auto py-8">
      {/* header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Import des données Spotify
        </h1>
        <p className="text-lg text-gray-600">
          Sélectionnez vos fichiers JSON d'historique d'écoute Spotify
        </p>
        <p className="text-sm text-gray-500 mt-2">
          ⚠️ Seuls les titres musicaux seront importés (podcasts et audiobooks
          exclus)
        </p>
      </div>

      {/* dropzone */}
      <div
        className={`relative border-2 ${
          isDragOver
            ? "border-green-500 bg-green-50"
            : "border-dashed border-gray-300"
        } rounded-lg p-12 text-center cursor-pointer transition-colors duration-200`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("spotify-files-input")?.click()}
      >
        <input
          id="spotify-files-input"
          type="file"
          accept=".json"
          multiple
          disabled={isUploading}
          onChange={onFileChange}
          className="hidden"
        />
        <FileUp className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-500 text-lg">
          Cliquez ou glissez-déposez vos fichiers JSON ici
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Plusieurs fichiers acceptés • Format JSON uniquement
        </p>
        {selectedFiles.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium">
              {selectedFiles.length} fichier(s) sélectionné(s) :
            </p>
            <div className="mt-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="text-left">
                  • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* actions - LAYOUT AMÉLIORÉ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={isUploading}
              variant="destructive"
              className="h-12 text-base font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Vider les données
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-bold text-red-600">⚠️ ATTENTION !</span>{" "}
                Cette action est irréversible. Cela supprimera{" "}
                <span className="font-bold">TOUTES</span> les données d'écoute,
                les artistes, albums et titres de votre base de données. Seules
                les tables de référence (pays, régions, catégories, événements)
                seront préservées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearDatabase}
                className="bg-red-600 hover:bg-red-700"
              >
                Oui, vider la base
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          onClick={handleImportClick}
          disabled={isUploading || selectedFiles.length === 0}
          className="h-12 text-base font-medium bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Download className="h-5 w-5 mr-2" />
          {isUploading ? "Import..." : "Importer"}
        </Button>

        <Button
          variant="outline"
          disabled={isUploading}
          className="h-12 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
        >
          <UploadIcon className="h-5 w-5 mr-2" />
          Exporter (bientôt)
        </Button>
      </div>

      {/* progress / messages */}
      {(isUploading || progress > 0) && (
        <div className="mt-8">
          <Progress value={progress} className="w-full h-3" />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      )}

      {/* Résultats d'import */}
      {importResult && (
        <div className="mt-8 space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Importation terminée !</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Traités:</span>{" "}
                    {importResult.summary.totalProcessed.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Valides:</span>{" "}
                    {importResult.summary.totalValid.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Filtrés:</span>{" "}
                    {importResult.summary.totalFiltered.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Créées:</span>{" "}
                    {importResult.summary.totalListensCreated.toLocaleString()}
                  </div>
                </div>
                {/* INDICATEUR DE SANTÉ */}
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">
                    Taux de réussite:{" "}
                    {Math.round(
                      (importResult.summary.totalListensCreated /
                        importResult.summary.totalValid) *
                        100
                    )}
                    %
                    {importResult.summary.totalListensCreated ===
                      importResult.summary.totalValid && " ✅ Parfait !"}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {importResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Erreurs détectées :</p>
                <div className="max-h-32 overflow-y-auto text-sm">
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-gray-500 mt-2">
                      ... et {importResult.errors.length - 10} autres erreurs
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {!isUploading && message && progress === 0 && !importResult && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
