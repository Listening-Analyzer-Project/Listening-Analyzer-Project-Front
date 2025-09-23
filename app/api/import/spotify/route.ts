import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import {
  type SpotifyListenData,
  filterValidListens,
  calculateIsValid,
  chunkArray,
  validateSpotifyData,
} from "@/lib/spotify-import"

// POST /api/import/spotify - Import optimisé avec logs détaillés
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      console.log("🚀 [API/Import] Début de la requête d'importation Spotify.")
      try {
        const { files } = await request.json()
        console.log(`📦 [API/Import] Reçu ${files.length} fichier(s) pour l'importation.`)

        if (!Array.isArray(files) || files.length === 0) {
          console.error("❌ [API/Import] Aucun fichier fourni ou format invalide.")
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Aucun fichier fourni" })}\n\n`),
          )
          controller.close()
          return
        }

        let totalProcessed = 0
        let totalValid = 0
        let totalFiltered = 0
        let totalErrors = 0
        let totalListensCreated = 0
        const allErrors: string[] = []

        let allFilteredListens: SpotifyListenData[] = []

        // Traiter chaque fichier pour collecter les données
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          const fileData = files[fileIndex]
          console.log(`📄 [API/Import] Traitement du fichier ${fileIndex + 1}/${files.length}: ${fileData.name}`)

          if (!fileData.name || !fileData.content) {
            allErrors.push(`Fichier ${fileIndex + 1}: Nom ou contenu manquant`)
            console.warn(`⚠️ [API/Import] Fichier ${fileIndex + 1} ignoré: Nom ou contenu manquant.`)
            continue
          }

          try {
            const jsonData = JSON.parse(fileData.content)
            console.log(`✅ [API/Import] Fichier ${fileData.name} parsé. Contient ${jsonData.length} entrées.`)
            if (!Array.isArray(jsonData)) {
              allErrors.push(`Fichier ${fileData.name}: Le contenu doit être un tableau JSON`)
              console.error(`❌ [API/Import] Fichier ${fileData.name}: Le contenu n'est pas un tableau JSON.`)
              continue
            }

            totalProcessed += jsonData.length

            const { valid, errors } = validateSpotifyData(jsonData)
            allErrors.push(...errors.map((err) => `${fileData.name}: ${err}`))
            totalErrors += errors.length
            console.log(
              `📊 [API/Import] Fichier ${fileData.name}: ${valid.length} valides, ${errors.length} erreurs de validation.`,
            )

            const filteredListens = filterValidListens(valid)
            totalFiltered += valid.length - filteredListens.length
            totalValid += filteredListens.length
            console.log(
              `🧹 [API/Import] Fichier ${fileData.name}: ${filteredListens.length} écoutes musicales après filtrage.`,
            )

            allFilteredListens = allFilteredListens.concat(filteredListens)
          } catch (error: any) {
            allErrors.push(`Fichier ${fileData.name}: Erreur de parsing JSON - ${error.message}`)
            totalErrors++
            console.error(`❌ [API/Import] Fichier ${fileData.name}: Erreur de parsing JSON -`, error)
          }
        }

        console.log(
          `📈 [API/Import] Total: ${totalProcessed} traités, ${totalValid} valides, ${totalFiltered} filtrés, ${totalErrors} erreurs initiales.`,
        )

        if (allFilteredListens.length === 0) {
          console.warn("⚠️ [API/Import] Aucune écoute valide à importer après le traitement des fichiers.")
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                result: {
                  success: true,
                  summary: {
                    totalProcessed,
                    totalValid: 0,
                    totalFiltered,
                    totalErrors,
                    totalListensCreated: 0,
                    filesProcessed: files.length,
                  },
                  errors: allErrors.slice(0, 50),
                },
              })}\n\n`,
            ),
          )
          controller.close()
          return
        }

        // ÉTAPE 1 : Créer TOUS les artistes et albums GLOBALEMENT
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              progress: 10,
              message: "Création des artistes et albums...",
            })}\n\n`,
          ),
        )
        console.log("⚙️ [API/Import] Démarrage de la création globale des artistes et albums.")
        const { artistMap, albumMap } = await createGlobalArtistsAndAlbums(allFilteredListens)
        console.log(`✅ [API/Import] Création globale terminée. Artistes: ${artistMap.size}, Albums: ${albumMap.size}.`)

        // ÉTAPE 2 : Traiter les chunks pour les tracks et écoutes
        const chunks = chunkArray(allFilteredListens, 1000)
        console.log(`📦 [API/Import] Division des écoutes en ${chunks.length} chunks.`)

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex]
          const progressPercent = Math.round(10 + ((chunkIndex + 1) / chunks.length) * 90)

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                progress: progressPercent,
                message: `Traitement chunk ${chunkIndex + 1}/${chunks.length} (${progressPercent}%)`,
              })}\n\n`,
            ),
          )
          console.log(
            `➡️ [API/Import] Traitement du chunk ${chunkIndex + 1}/${chunks.length} (taille: ${chunk.length}).`,
          )

          try {
            const listenCount = await processListenChunk(chunk, chunkIndex + 1, artistMap, albumMap)
            totalListensCreated += listenCount
            console.log(`✅ [API/Import] Chunk ${chunkIndex + 1} traité. ${listenCount} écoutes insérées/mises à jour.`)
          } catch (chunkError: any) {
            allErrors.push(`Chunk ${chunkIndex + 1}: ${chunkError.message}`)
            console.error(`❌ [API/Import] Erreur lors du traitement du chunk ${chunkIndex + 1}:`, chunkError)
          }
        }

        console.log(`🎉 [API/Import] Importation terminée. Total écoutes créées: ${totalListensCreated}.`)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              result: {
                success: true,
                summary: {
                  totalProcessed,
                  totalValid,
                  totalFiltered,
                  totalErrors,
                  totalListensCreated,
                  filesProcessed: files.length,
                },
                errors: allErrors.slice(0, 50),
              },
            })}\n\n`,
          ),
        )
      } catch (error: any) {
        console.error("🔥 [API/Import] Erreur fatale dans le flux d'importation:", error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`))
      } finally {
        console.log("🔚 [API/Import] Fin du flux d'importation.")
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// NOUVELLE FONCTION : Créer tous les artistes et albums globalement
async function createGlobalArtistsAndAlbums(allListens: SpotifyListenData[]): Promise<{
  artistMap: Map<string, number>
  albumMap: Map<string, number>
}> {
  console.log("➡️ [createGlobalArtistsAndAlbums] Début de la collecte des artistes et albums uniques.")
  // 1. Collecter TOUS les artistes et albums uniques
  const uniqueArtists = new Set<string>()
  const uniqueAlbumsData = new Map<string, { title: string; spotify_uri: string | null }>()

  for (const listen of allListens) {
    // Artistes
    if (listen.master_metadata_album_artist_name) {
      uniqueArtists.add(listen.master_metadata_album_artist_name)
    }

    // Albums
    const title = listen.master_metadata_album_album_name?.trim() || ""
    if (title.length > 0) {
      const spotify_uri = extractSpotifyAlbumUri(listen)
      const albumKey = spotify_uri || `noUri::${title.toLowerCase()}`

      if (!uniqueAlbumsData.has(albumKey)) {
        uniqueAlbumsData.set(albumKey, { title, spotify_uri })
      }
    }
  }
  console.log(
    `📊 [createGlobalArtistsAndAlbums] Collecte terminée. ${uniqueArtists.size} artistes uniques, ${uniqueAlbumsData.size} albums uniques.`,
  )

  // 2. Créer tous les artistes
  console.log("➡️ [createGlobalArtistsAndAlbums] Appel de batchCreateArtists.")
  const artistMap = await batchCreateArtists(Array.from(uniqueArtists), "GLOBAL")
  console.log(`✅ [createGlobalArtistsAndAlbums] batchCreateArtists terminé. Map contient ${artistMap.size} artistes.`)

  // 3. Créer tous les albums
  console.log("➡️ [createGlobalArtistsAndAlbums] Appel de batchCreateAlbums.")
  const albumMap = await batchCreateAlbums(Array.from(uniqueAlbumsData.values()), "GLOBAL")
  console.log(`✅ [createGlobalArtistsAndAlbums] batchCreateAlbums terminé. Map contient ${albumMap.size} albums.`)

  // 4. Créer les liaisons album-artiste GLOBALEMENT
  console.log("➡️ [createGlobalArtistsAndAlbums] Appel de createGlobalAlbumArtistLinks.")
  await createGlobalAlbumArtistLinks(allListens, albumMap, artistMap)
  console.log("✅ [createGlobalArtistsAndAlbums] createGlobalAlbumArtistLinks terminé.")

  console.log("🔚 [createGlobalArtistsAndAlbums] Fin.")
  return { artistMap, albumMap }
}

// Traitement optimisé des chunks (sans création d'artistes/albums)
async function processListenChunk(
  listens: SpotifyListenData[],
  chunkNumber: number,
  artistMap: Map<string, number>,
  albumMap: Map<string, number>,
): Promise<number> {
  console.log(`➡️ [processListenChunk ${chunkNumber}] Début du traitement du chunk.`)
  // 1. Collecter les tracks uniques
  const uniqueTracks = new Map<string, SpotifyListenData>()

  for (const listen of listens) {
    if (listen.spotify_track_uri && listen.master_metadata_track_name) {
      uniqueTracks.set(listen.spotify_track_uri, listen)
    }
  }
  console.log(`📊 [processListenChunk ${chunkNumber}] ${uniqueTracks.size} tracks uniques dans ce chunk.`)

  try {
    // 2. Créer les tracks (les artistes et albums existent déjà)
    console.log(`➡️ [processListenChunk ${chunkNumber}] Appel de batchCreateTracks.`)
    const trackMap = await batchCreateTracks(uniqueTracks, albumMap, chunkNumber)
    console.log(
      `✅ [processListenChunk ${chunkNumber}] batchCreateTracks terminé. Map contient ${trackMap.size} tracks.`,
    )

    // 3. Créer les liaisons track-artiste
    console.log(`➡️ [processListenChunk ${chunkNumber}] Appel de createTrackArtistLinks.`)
    await createTrackArtistLinks(uniqueTracks, trackMap, artistMap, chunkNumber)
    console.log(`✅ [processListenChunk ${chunkNumber}] createTrackArtistLinks terminé.`)

    // 4. Préparer les écoutes pour l'insertion
    const listenRecords = []
    let skippedListens = 0

    for (const listen of listens) {
      const trackId = trackMap.get(listen.spotify_track_uri || "")
      if (trackId) {
        listenRecords.push({
          ts: listen.ts,
          platform: listen.platform,
          ms_played: listen.ms_played,
          is_valid: calculateIsValid(listen.ms_played),
          conn_country: listen.conn_country,
          ip_addr: listen.ip_addr,
          track_id: trackId,
          reason_start: listen.reason_start,
          reason_end: listen.reason_end,
          shuffle: listen.shuffle,
          skipped: listen.skipped,
          offline: listen.offline,
          incognito_mode: listen.incognito_mode,
        })
      } else {
        skippedListens++
      }
    }
    console.log(
      `📊 [processListenChunk ${chunkNumber}] ${listenRecords.length} écoutes à insérer, ${skippedListens} ignorées.`,
    )

    // 5. Insertion des écoutes
    if (listenRecords.length > 0) {
      console.log(`➡️ [processListenChunk ${chunkNumber}] Appel de insertListens.`)
      const insertedCount = await insertListens(listenRecords, chunkNumber)
      console.log(`✅ [processListenChunk ${chunkNumber}] insertListens terminé. ${insertedCount} écoutes insérées.`)

      if (skippedListens > 0) {
        console.warn(
          `⚠️ [processListenChunk ${chunkNumber}] Ignoré ${skippedListens} écoutes en raison d'IDs de track manquants après la création des tracks.`,
        )
      }
      console.log(`🔚 [processListenChunk ${chunkNumber}] Fin.`)
      return insertedCount
    } else {
      console.log(`🔚 [processListenChunk ${chunkNumber}] Aucune écoute à insérer. Fin.`)
      return 0
    }
  } catch (error: any) {
    console.error(`❌ [processListenChunk ${chunkNumber}] Erreur inattendue:`, error)
    throw error
  }
}

// Fonctions optimisées avec logs détaillés
async function batchCreateArtists(artistNames: string[], context: string): Promise<Map<string, number>> {
  const artistMap = new Map<string, number>()
  if (artistNames.length === 0) {
    console.log(`➡️ [batchCreateArtists ${context}] Aucun artiste à traiter.`)
    return artistMap
  }

  console.log(`➡️ [batchCreateArtists ${context}] Début du traitement de ${artistNames.length} artistes.`)
  try {
    const ARTIST_CHUNK_SIZE = 100
    const artistChunks = chunkArray(artistNames, ARTIST_CHUNK_SIZE)
    console.log(`📦 [batchCreateArtists ${context}] Divisé en ${artistChunks.length} sous-chunks.`)

    for (let i = 0; i < artistChunks.length; i++) {
      const currentChunk = artistChunks[i]
      console.log(
        `🔍 [batchCreateArtists ${context}] Traitement du sous-chunk ${i + 1}/${artistChunks.length} (taille: ${currentChunk.length}).`,
      )

      // Récupérer les existants pour ce chunk
      console.log(`DB [batchCreateArtists ${context}] Sélection des artistes existants...`)
      const { data: existingArtists, error: selectError } = await supabase
        .from("artists")
        .select("id, name")
        .in("name", currentChunk)

      if (selectError) {
        console.error(
          `❌ DB [batchCreateArtists ${context}] Erreur lors de la sélection des artistes existants:`,
          selectError,
        )
        throw selectError
      }

      if (existingArtists) {
        console.log(`✅ DB [batchCreateArtists ${context}] Trouvé ${existingArtists.length} artistes existants.`)
        existingArtists.forEach((artist) => {
          artistMap.set(artist.name, artist.id)
        })
      }

      // Créer les manquants pour ce chunk
      const missingArtists = currentChunk.filter((name) => !artistMap.has(name))
      if (missingArtists.length > 0) {
        console.log(`DB [batchCreateArtists ${context}] Insertion de ${missingArtists.length} nouveaux artistes...`)
        const { data: newArtists, error: insertError } = await supabase
          .from("artists")
          .insert(missingArtists.map((name) => ({ name })))
          .select("id, name")

        if (insertError) {
          console.error(
            `❌ DB [batchCreateArtists ${context}] Erreur lors de l'insertion des nouveaux artistes:`,
            insertError,
          )
          throw insertError
        }

        if (newArtists) {
          console.log(`✅ DB [batchCreateArtists ${context}] Inséré ${newArtists.length} nouveaux artistes.`)
          newArtists.forEach((artist) => {
            artistMap.set(artist.name, artist.id)
          })
        }
      } else {
        console.log(`DB [batchCreateArtists ${context}] Aucun nouvel artiste à insérer dans ce sous-chunk.`)
      }
    }
    console.log(`🔚 [batchCreateArtists ${context}] Fin. Total artistes mappés: ${artistMap.size}.`)
    return artistMap
  } catch (error) {
    console.error(`❌ [batchCreateArtists ${context}] Erreur lors de la création des artistes:`, error)
    throw error
  }
}

async function batchCreateAlbums(
  items: { title: string; spotify_uri: string | null }[],
  context: string,
): Promise<Map<string, number>> {
  const albumMap = new Map<string, number>()
  if (items.length === 0) {
    console.log(`➡️ [batchCreateAlbums ${context}] Aucun album à traiter.`)
    return albumMap
  }

  console.log(`➡️ [batchCreateAlbums ${context}] Début du traitement de ${items.length} albums.`)
  try {
    // 1. Séparer ceux qui ont une URI et ceux qui n'en ont pas
    const withUri = items.filter((a) => a.spotify_uri)
    const noUri = items.filter((a) => !a.spotify_uri)
    console.log(`📊 [batchCreateAlbums ${context}] ${withUri.length} avec URI, ${noUri.length} sans URI.`)

    // 2. Gérer d'abord les albums AVEC URI
    if (withUri.length > 0) {
      console.log(`➡️ [batchCreateAlbums ${context}] Traitement des albums avec URI...`)
      const uris = withUri.map((a) => a.spotify_uri!)
      const { data: existing, error: selErr } = await supabase
        .from("albums")
        .select("id, spotify_uri")
        .in("spotify_uri", uris)

      if (selErr) {
        console.error(`❌ DB [batchCreateAlbums ${context}] Erreur lors de la sélection des albums avec URI:`, selErr)
        throw selErr
      }

      if (existing) {
        console.log(`✅ DB [batchCreateAlbums ${context}] Trouvé ${existing.length} albums existants avec URI.`)
        existing.forEach((row) => {
          albumMap.set(row.spotify_uri, row.id)
        })
      }

      const missing = withUri.filter((a) => !albumMap.has(a.spotify_uri!))
      if (missing.length > 0) {
        const toInsert = missing.map((a) => ({
          title: a.title,
          spotify_uri: a.spotify_uri,
        }))
        console.log(`DB [batchCreateAlbums ${context}] Insertion de ${toInsert.length} nouveaux albums avec URI...`)
        const { data: inserted, error: insErr } = await supabase
          .from("albums")
          .insert(toInsert)
          .select("id, spotify_uri")

        if (insErr) {
          console.error(`❌ DB [batchCreateAlbums ${context}] Erreur lors de l'insertion des albums avec URI:`, insErr)
          throw insErr
        }

        if (inserted) {
          console.log(`✅ DB [batchCreateAlbums ${context}] Inséré ${inserted.length} nouveaux albums avec URI.`)
          inserted.forEach((row) => {
            albumMap.set(row.spotify_uri!, row.id)
          })
        }
      } else {
        console.log(`DB [batchCreateAlbums ${context}] Aucun nouvel album avec URI à insérer.`)
      }
    }

    // 3. Gérer les albums SANS URI (OPTIMISÉ EN BATCH AVEC CHUNKS)
    if (noUri.length > 0) {
      console.log(`➡️ [batchCreateAlbums ${context}] Traitement des albums sans URI...`)
      const uniqueTitles = Array.from(new Set(noUri.map((a) => a.title.trim()).filter((t) => t.length > 0)))
      console.log(`📊 [batchCreateAlbums ${context}] ${uniqueTitles.length} titres uniques sans URI.`)

      if (uniqueTitles.length > 0) {
        const TITLE_CHUNK_SIZE = 100
        const titleChunks = chunkArray(uniqueTitles, TITLE_CHUNK_SIZE)
        console.log(`📦 [batchCreateAlbums ${context}] Divisé en ${titleChunks.length} sous-chunks (sans URI).`)

        for (let i = 0; i < titleChunks.length; i++) {
          const currentTitleChunk = titleChunks[i]
          console.log(
            `🔍 [batchCreateAlbums ${context}] Traitement du sous-chunk ${i + 1}/${titleChunks.length} (taille: ${currentTitleChunk.length}) sans URI.`,
          )

          // 3.a BATCH SELECT : Rechercher les albums sans URI existants pour ce chunk
          const { data: existingNoUriAlbums, error: selErr } = await supabase
            .from("albums")
            .select("id, title")
            .is("spotify_uri", null)
            .in("title", currentTitleChunk)

          if (selErr) {
            console.error(
              `❌ DB [batchCreateAlbums ${context}] Erreur lors de la sélection des albums sans URI:`,
              selErr,
            )
            throw selErr
          }

          if (existingNoUriAlbums) {
            console.log(
              `✅ DB [batchCreateAlbums ${context}] Trouvé ${existingNoUriAlbums.length} albums existants sans URI.`,
            )
            existingNoUriAlbums.forEach((album) => {
              albumMap.set(`noUri::${album.title.toLowerCase()}`, album.id)
            })
          }

          // 3.b BATCH INSERT : Créer les albums manquants sans URI pour ce chunk
          const missingTitles = currentTitleChunk.filter((title) => !albumMap.has(`noUri::${title.toLowerCase()}`))
          if (missingTitles.length > 0) {
            const albumsToInsert = missingTitles.map((title) => ({ title }))
            console.log(
              `DB [batchCreateAlbums ${context}] Insertion de ${albumsToInsert.length} nouveaux albums sans URI...`,
            )
            const { data: newNoUriAlbums, error: insErr } = await supabase
              .from("albums")
              .insert(albumsToInsert)
              .select("id, title")

            if (insErr) {
              console.error(
                `❌ DB [batchCreateAlbums ${context}] Erreur lors de l'insertion des albums sans URI:`,
                insErr,
              )
              throw insErr
            }

            if (newNoUriAlbums) {
              console.log(
                `✅ DB [batchCreateAlbums ${context}] Inséré ${newNoUriAlbums.length} nouveaux albums sans URI.`,
              )
              newNoUriAlbums.forEach((album) => {
                albumMap.set(`noUri::${album.title.toLowerCase()}`, album.id)
              })
            }
          } else {
            console.log(`DB [batchCreateAlbums ${context}] Aucun nouvel album sans URI à insérer dans ce sous-chunk.`)
          }
        }
      } else {
        console.log(`📊 [batchCreateAlbums ${context}] Aucun titre valide sans URI à traiter.`)
      }
    }
    console.log(`🔚 [batchCreateAlbums ${context}] Fin. Total albums mappés: ${albumMap.size}.`)
    return albumMap
  } catch (error) {
    console.error(`❌ [batchCreateAlbums ${context}] Erreur lors de la création des albums:`, error)
    throw error
  }
}

async function batchCreateTracks(
  uniqueTracks: Map<string, SpotifyListenData>,
  albumMap: Map<string, number>,
  chunkNumber: number,
): Promise<Map<string, number>> {
  const trackMap = new Map<string, number>()
  if (uniqueTracks.size === 0) {
    console.log(`➡️ [batchCreateTracks ${chunkNumber}] Aucune track à traiter.`)
    return trackMap
  }

  console.log(`➡️ [batchCreateTracks ${chunkNumber}] Début du traitement de ${uniqueTracks.size} tracks.`)
  try {
    const tracksToUpsert = []
    let invalidTracks = 0
    console.log(`➡️ [batchCreateTracks ${chunkNumber}] Préparation de ${uniqueTracks.size} tracks pour l'UPSERT.`)

    for (const [uri, listen] of uniqueTracks) {
      const albumName = listen.master_metadata_album_album_name?.trim() || ""
      const spotify_uri_album = extractSpotifyAlbumUri(listen)
      const albumKey = spotify_uri_album || `noUri::${albumName.toLowerCase()}`
      const albumId = albumMap.get(albumKey) || null

      if (!listen.master_metadata_track_name || listen.master_metadata_track_name.trim() === "") {
        invalidTracks++
        console.warn(`⚠️ [batchCreateTracks ${chunkNumber}] Track ignorée (titre manquant): ${uri}`)
        continue
      }

      if (listen.master_metadata_track_name.length > 255) {
        invalidTracks++
        console.warn(
          `⚠️ [batchCreateTracks ${chunkNumber}] Track ignorée (titre trop long): ${listen.master_metadata_track_name.substring(0, 50)}...`,
        )
        continue
      }

      tracksToUpsert.push({
        title: listen.master_metadata_track_name.trim(),
        spotify_uri: uri,
        album_id: albumId,
        duration_ms: listen.ms_played, // Using ms_played as a placeholder for duration_ms
        explicit: false, // Default value, as not available in SpotifyListenData
        popularity: 0, // Default value, as not available in SpotifyListenData
        // Add other audio features if available in SpotifyListenData or fetched elsewhere
      })
    }
    console.log(
      `📊 [batchCreateTracks ${chunkNumber}] ${tracksToUpsert.length} tracks prêtes pour l'UPSERT, ${invalidTracks} ignorées.`,
    )

    if (tracksToUpsert.length > 0) {
      console.log(
        `DB [batchCreateTracks ${chunkNumber}] Exécution de la requête UPSERT pour ${tracksToUpsert.length} tracks...`,
      )
      const { data: upsertedTracks, error: upsertError } = await supabase
        .from("tracks")
        .upsert(tracksToUpsert, {
          onConflict: "spotify_uri", // Utilise l'URI Spotify comme cible de conflit
          ignoreDuplicates: false, // Permet la mise à jour si un conflit est trouvé
        })
        .select("id, spotify_uri")

      if (upsertError) {
        console.error(`❌ DB [batchCreateTracks ${chunkNumber}] Erreur lors de l'UPSERT des tracks:`, upsertError)
        throw upsertError
      }

      if (upsertedTracks) {
        console.log(
          `✅ DB [batchCreateTracks ${chunkNumber}] Requête UPSERT terminée. Traité ${upsertedTracks.length} tracks.`,
        )
        upsertedTracks.forEach((track) => {
          trackMap.set(track.spotify_uri, track.id)
        })
      }
    } else {
      console.log(`DB [batchCreateTracks ${chunkNumber}] Aucune track à upsert.`)
    }
    console.log(`🔚 [batchCreateTracks ${chunkNumber}] Fin. Total tracks mappées: ${trackMap.size}.`)
    return trackMap
  } catch (error) {
    console.error(`❌ [batchCreateTracks ${chunkNumber}] Erreur lors de la création des tracks:`, error)
    throw error
  }
}

async function createTrackArtistLinks(
  uniqueTracks: Map<string, SpotifyListenData>,
  trackMap: Map<string, number>,
  artistMap: Map<string, number>,
  chunkNumber: number,
): Promise<void> {
  console.log(`➡️ [createTrackArtistLinks ${chunkNumber}] Début de la création des liens track-artiste.`)
  const trackArtistLinks = []

  for (const [uri, listen] of uniqueTracks) {
    const trackId = trackMap.get(uri)
    const artistName = listen.master_metadata_album_artist_name
    const artistId = artistName ? artistMap.get(artistName) : null

    if (trackId && artistId) {
      trackArtistLinks.push({
        track_id: trackId,
        artist_id: artistId,
        is_primary: true,
      })
    } else {
      if (!trackId) console.warn(`⚠️ [createTrackArtistLinks ${chunkNumber}] Track ID manquant pour URI: ${uri}`)
      if (!artistId)
        console.warn(`⚠️ [createTrackArtistLinks ${chunkNumber}] Artist ID manquant pour nom: ${artistName}`)
    }
  }
  console.log(`📊 [createTrackArtistLinks ${chunkNumber}] ${trackArtistLinks.length} liens track-artiste à upsert.`)

  if (trackArtistLinks.length > 0) {
    console.log(`DB [createTrackArtistLinks ${chunkNumber}] Upsert des liens track-artiste...`)
    const { error } = await supabase.from("track_artists").upsert(trackArtistLinks, {
      onConflict: "track_id,artist_id",
      ignoreDuplicates: true,
    })

    if (error) {
      console.error(`❌ DB [createTrackArtistLinks ${chunkNumber}] Erreur lors de l'upsert des track_artists:`, error)
      // Ne pas throw ici pour ne pas bloquer le reste du chunk si c'est une erreur non critique
    } else {
      console.log(`✅ DB [createTrackArtistLinks ${chunkNumber}] Upsert réussi pour ${trackArtistLinks.length} liens.`)
    }
  } else {
    console.log(`DB [createTrackArtistLinks ${chunkNumber}] Aucun lien track-artiste à upsert.`)
  }
  console.log(`🔚 [createTrackArtistLinks ${chunkNumber}] Fin.`)
}

// NOUVELLE FONCTION : Créer les liaisons album-artiste globalement
async function createGlobalAlbumArtistLinks(
  allListens: SpotifyListenData[],
  albumMap: Map<string, number>,
  artistMap: Map<string, number>,
): Promise<void> {
  console.log("➡️ [createGlobalAlbumArtistLinks] Début de la création des liens album-artiste.")
  const albumArtistLinks = []
  const albumArtistPairs = new Set<string>()

  for (const listen of allListens) {
    const albumName = listen.master_metadata_album_album_name?.trim()
    const artistName = listen.master_metadata_album_artist_name

    if (albumName && artistName) {
      const spotify_uri = extractSpotifyAlbumUri(listen)
      const albumKey = spotify_uri || `noUri::${albumName.toLowerCase()}`

      const albumId = albumMap.get(albumKey)
      const artistId = artistMap.get(artistName)

      if (albumId && artistId) {
        const pairKey = `${albumId}-${artistId}`
        if (!albumArtistPairs.has(pairKey)) {
          albumArtistPairs.add(pairKey)
          albumArtistLinks.push({
            album_id: albumId,
            artist_id: artistId,
          })
        }
      } else {
        if (!albumId) console.warn(`⚠️ [createGlobalAlbumArtistLinks] Album ID manquant pour album: ${albumName}`)
        if (!artistId) console.warn(`⚠️ [createGlobalAlbumArtistLinks] Artist ID manquant pour artiste: ${artistName}`)
      }
    }
  }
  console.log(`📊 [createGlobalAlbumArtistLinks] ${albumArtistLinks.length} liens album-artiste à upsert.`)

  if (albumArtistLinks.length > 0) {
    console.log("DB [createGlobalAlbumArtistLinks] Upsert des liens album-artiste...")
    const { error } = await supabase.from("album_artists").upsert(albumArtistLinks, {
      onConflict: "album_id,artist_id",
      ignoreDuplicates: true,
    })

    if (error) {
      console.error("❌ DB [createGlobalAlbumArtistLinks] Erreur lors de l'upsert des album_artists:", error)
      // Ne pas throw ici
    } else {
      console.log(`✅ DB [createGlobalAlbumArtistLinks] Upsert réussi pour ${albumArtistLinks.length} liens.`)
    }
  } else {
    console.log("DB [createGlobalAlbumArtistLinks] Aucun lien album-artiste à upsert.")
  }
  console.log("🔚 [createGlobalAlbumArtistLinks] Fin.")
}

async function insertListens(listenRecords: any[], chunkNumber: number): Promise<number> {
  console.log(`➡️ [insertListens ${chunkNumber}] Début de l'insertion de ${listenRecords.length} écoutes.`)
  try {
    const { data, error, count } = await supabase
      .from("listens")
      .upsert(listenRecords, {
        onConflict: "track_id,ts,ms_played",
        ignoreDuplicates: true,
        count: "exact",
      })
      .select("id")

    if (error) {
      console.error(`❌ DB [insertListens ${chunkNumber}] Erreur lors de l'insertion des écoutes:`, error)
      throw error
    }

    console.log(`✅ DB [insertListens ${chunkNumber}] Inséré/Mis à jour ${count || 0} écoutes.`)
    return count || 0
  } catch (error) {
    console.error(`❌ [insertListens ${chunkNumber}] Erreur inattendue lors de l'insertion des écoutes:`, error)
    throw error
  }
}

function extractSpotifyAlbumUri(listen: SpotifyListenData): string | null {
  // Tentative d'extraire l'URI depuis le contexte (à adapter selon la structure réelle)
  // Si vos données Spotify incluent un champ pour l'URI de l'album, utilisez-le ici.
  // Par exemple, si c'est `listen.master_metadata_album_uri`:
  // if (listen.master_metadata_album_uri) {
  //   return listen.master_metadata_album_uri;
  // }
  // Pour l'instant, basé sur le code précédent, il n'y a pas d'URI d'album direct dans SpotifyListenData.
  // Si `spotify_id` est censé être l'URI de l'album, alors c'est correct.
  // Sinon, cette fonction retournera toujours null, ce qui est géré par la clé `noUri::`
  if ((listen as any).spotify_id) {
    // Cast to any to access spotify_id if it's not in the interface
    return (listen as any).spotify_id
  }
  return null
}
