import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// DELETE /api/listens/bulk-delete
export async function DELETE(request: NextRequest) {
  try {
    const { ids: listenIdsToDelete } = await request.json()

    if (!Array.isArray(listenIdsToDelete) || listenIdsToDelete.length === 0) {
      return NextResponse.json({ error: "IDs must be a non-empty array" }, { status: 400 })
    }

    // Étape 1: Récupérer les track_ids associés aux écoutes à supprimer AVANT la suppression
    const { data: affectedListens, error: fetchAffectedListensError } = await supabase
      .from("listens")
      .select("track_id")
      .in("id", listenIdsToDelete)

    if (fetchAffectedListensError) {
      console.error("❌ Erreur lors de la récupération des écoutes affectées:", fetchAffectedListensError)
      throw fetchAffectedListensError
    }

    const initialAffectedTrackIds = new Set<number>()
    affectedListens.forEach((listen) => {
      if (listen.track_id) {
        initialAffectedTrackIds.add(listen.track_id)
      }
    })

    // Étape 2: Supprimer les écoutes
    const {
      data: deleteResult,
      error: deleteListensError,
      count: supabaseDeleteCount,
    } = await supabase.from("listens").delete({ count: "exact" }).in("id", listenIdsToDelete).select("id")

    if (deleteListensError) {
      console.error("❌ Erreur lors de la suppression des écoutes:", deleteListensError)
      throw deleteListensError
    }

    const deletedListensCount = supabaseDeleteCount !== null ? supabaseDeleteCount : listenIdsToDelete.length

    let deletedTracksCount = 0
    let deletedAlbumsCount = 0
    let deletedArtistsCount = 0
    let deletedGenresCount = 0
    let deletedSubGenresCount = 0
    let deletedAmbiancesCount = 0
    let deletedSpotifyGenresCount = 0

    // Si aucun titre n'a été affecté, pas besoin de nettoyer
    if (initialAffectedTrackIds.size === 0) {
      return NextResponse.json({
        success: true,
        message: `${deletedListensCount} écoute(s) supprimée(s) avec succès. Aucune entité orpheline à nettoyer.`,
        deletedListensCount,
        deletedTracksCount: 0,
        deletedAlbumsCount: 0,
        deletedArtistsCount: 0,
        deletedGenresCount: 0,
        deletedSubGenresCount: 0,
        deletedAmbiancesCount: 0,
        deletedSpotifyGenresCount: 0,
      })
    }

    // Étape 3: Récupérer les IDs des entités liées AVANT suppression des tracks
    const { data: tracksToAnalyze, error: fetchTracksError } = await supabase
      .from("tracks")
      .select(
        `
        id,
        album_id,
        genre_id,
        sub_genre_id,
        ambiance_id,
        track_artists (
          artist_id
        )
      `,
      )
      .in("id", Array.from(initialAffectedTrackIds))

    if (fetchTracksError) {
      console.error("❌ Erreur lors de la récupération des tracks à analyser:", fetchTracksError)
      throw fetchTracksError
    }

    const initialAffectedAlbumIds = new Set<number>()
    const initialAffectedArtistIds = new Set<number>()
    const initialAffectedGenreIds = new Set<number>()
    const initialAffectedSubGenreIds = new Set<number>()
    const initialAffectedAmbianceIds = new Set<number>()

    tracksToAnalyze.forEach((track) => {
      if (track.album_id) initialAffectedAlbumIds.add(track.album_id)
      if (track.genre_id) initialAffectedGenreIds.add(track.genre_id)
      if (track.sub_genre_id) initialAffectedSubGenreIds.add(track.sub_genre_id)
      if (track.ambiance_id) initialAffectedAmbianceIds.add(track.ambiance_id)
      track.track_artists.forEach((ta: { artist_id: number }) => {
        if (ta.artist_id) initialAffectedArtistIds.add(ta.artist_id)
      })
    })

    // Étape 4: Identifier et supprimer les titres orphelins
    const { data: orphanedTracks, error: fetchOrphanedTracksError } = await supabase.rpc("get_orphaned_tracks", {
      p_track_ids: Array.from(initialAffectedTrackIds),
    })

    if (fetchOrphanedTracksError) {
      console.error("❌ Erreur lors de la récupération des titres orphelins:", fetchOrphanedTracksError)
      throw fetchOrphanedTracksError
    }

    const trackIdsToDelete = orphanedTracks.map((t: { id: number }) => t.id)

    if (trackIdsToDelete.length > 0) {
      const {
        data: deleteTracksResult,
        error: deleteTracksError,
        count: supabaseTracksCount,
      } = await supabase.from("tracks").delete({ count: "exact" }).in("id", trackIdsToDelete).select("id")

      if (deleteTracksError) {
        console.error("❌ Erreur lors de la suppression des titres:", deleteTracksError)
        throw deleteTracksError
      }
      deletedTracksCount = supabaseTracksCount !== null ? supabaseTracksCount : trackIdsToDelete.length
    }

    // Étape 5: Identifier et supprimer les albums orphelins
    if (initialAffectedAlbumIds.size > 0) {
      const { data: orphanedAlbums, error: fetchOrphanedAlbumsError } = await supabase.rpc("get_orphaned_albums", {
        p_album_ids: Array.from(initialAffectedAlbumIds),
      })

      if (fetchOrphanedAlbumsError) {
        console.error("❌ Erreur lors de la récupération des albums orphelins:", fetchOrphanedAlbumsError)
        throw fetchOrphanedAlbumsError
      }

      const albumIdsToDelete = orphanedAlbums.map((a: { id: number }) => a.id)

      if (albumIdsToDelete.length > 0) {
        const { error: deleteAlbumsError, count: supabaseAlbumsCount } = await supabase
          .from("albums")
          .delete({ count: "exact" })
          .in("id", albumIdsToDelete)

        if (deleteAlbumsError) {
          console.error("❌ Erreur lors de la suppression des albums:", deleteAlbumsError)
          throw deleteAlbumsError
        }
        deletedAlbumsCount = supabaseAlbumsCount !== null ? supabaseAlbumsCount : albumIdsToDelete.length
      }
    }

    // Étape 6: Récupérer les spotify_genre_ids des artistes AVANT suppression
    const initialAffectedSpotifyGenreIds = new Set<number>()
    if (initialAffectedArtistIds.size > 0) {
      const { data: artistSpotifyGenres, error: fetchArtistSpotifyGenresError } = await supabase
        .from("artist_spotify_genres")
        .select("spotify_genre_id")
        .in("artist_id", Array.from(initialAffectedArtistIds))

      if (fetchArtistSpotifyGenresError) {
        console.error(
          "❌ Erreur lors de la récupération des genres Spotify des artistes:",
          fetchArtistSpotifyGenresError,
        )
        throw fetchArtistSpotifyGenresError
      }

      artistSpotifyGenres.forEach((asg) => {
        if (asg.spotify_genre_id) initialAffectedSpotifyGenreIds.add(asg.spotify_genre_id)
      })
    }

    // Étape 7: Identifier et supprimer les artistes orphelins
    if (initialAffectedArtistIds.size > 0) {
      const { data: orphanedArtists, error: fetchOrphanedArtistsError } = await supabase.rpc("get_orphaned_artists", {
        p_artist_ids: Array.from(initialAffectedArtistIds),
      })

      if (fetchOrphanedArtistsError) {
        console.error("❌ Erreur lors de la récupération des artistes orphelins:", fetchOrphanedArtistsError)
        throw fetchOrphanedArtistsError
      }

      const artistIdsToDelete = orphanedArtists.map((a: { id: number }) => a.id)

      if (artistIdsToDelete.length > 0) {
        const { error: deleteArtistsError, count: supabaseArtistsCount } = await supabase
          .from("artists")
          .delete({ count: "exact" })
          .in("id", artistIdsToDelete)

        if (deleteArtistsError) {
          console.error("❌ Erreur lors de la suppression des artistes:", deleteArtistsError)
          throw deleteArtistsError
        }
        deletedArtistsCount = supabaseArtistsCount !== null ? supabaseArtistsCount : artistIdsToDelete.length
      }
    }

    // Étape 8: Nettoyer les genres orphelins
    if (initialAffectedGenreIds.size > 0) {
      const { data: orphanedGenres, error: fetchOrphanedGenresError } = await supabase.rpc("get_orphaned_genres", {
        p_genre_ids: Array.from(initialAffectedGenreIds),
      })

      if (fetchOrphanedGenresError) {
        console.error("❌ Erreur lors de la récupération des genres orphelins:", fetchOrphanedGenresError)
        throw fetchOrphanedGenresError
      }

      const genreIdsToDelete = orphanedGenres.map((g: { id: number }) => g.id)

      if (genreIdsToDelete.length > 0) {
        const { error: deleteGenresError, count: supabaseGenresCount } = await supabase
          .from("genres")
          .delete({ count: "exact" })
          .in("id", genreIdsToDelete)

        if (deleteGenresError) {
          console.error("❌ Erreur lors de la suppression des genres:", deleteGenresError)
          throw deleteGenresError
        }
        deletedGenresCount = supabaseGenresCount !== null ? supabaseGenresCount : genreIdsToDelete.length
      }
    }

    // Étape 9: Nettoyer les sous-genres orphelins
    if (initialAffectedSubGenreIds.size > 0) {
      const { data: orphanedSubGenres, error: fetchOrphanedSubGenresError } = await supabase.rpc(
        "get_orphaned_sub_genres",
        {
          p_sub_genre_ids: Array.from(initialAffectedSubGenreIds),
        },
      )

      if (fetchOrphanedSubGenresError) {
        console.error("❌ Erreur lors de la récupération des sous-genres orphelins:", fetchOrphanedSubGenresError)
        throw fetchOrphanedSubGenresError
      }

      const subGenreIdsToDelete = orphanedSubGenres.map((sg: { id: number }) => sg.id)

      if (subGenreIdsToDelete.length > 0) {
        const { error: deleteSubGenresError, count: supabaseSubGenresCount } = await supabase
          .from("sub_genres")
          .delete({ count: "exact" })
          .in("id", subGenreIdsToDelete)

        if (deleteSubGenresError) {
          console.error("❌ Erreur lors de la suppression des sous-genres:", deleteSubGenresError)
          throw deleteSubGenresError
        }
        deletedSubGenresCount = supabaseSubGenresCount !== null ? supabaseSubGenresCount : subGenreIdsToDelete.length
      }
    }

    // Étape 10: Nettoyer les ambiances orphelines
    if (initialAffectedAmbianceIds.size > 0) {
      const { data: orphanedAmbiances, error: fetchOrphanedAmbiancesError } = await supabase.rpc(
        "get_orphaned_ambiances",
        {
          p_ambiance_ids: Array.from(initialAffectedAmbianceIds),
        },
      )

      if (fetchOrphanedAmbiancesError) {
        console.error("❌ Erreur lors de la récupération des ambiances orphelines:", fetchOrphanedAmbiancesError)
        throw fetchOrphanedAmbiancesError
      }

      const ambianceIdsToDelete = orphanedAmbiances.map((am: { id: number }) => am.id)

      if (ambianceIdsToDelete.length > 0) {
        const { error: deleteAmbiancesError, count: supabaseAmbiancesCount } = await supabase
          .from("ambiances")
          .delete({ count: "exact" })
          .in("id", ambianceIdsToDelete)

        if (deleteAmbiancesError) {
          console.error("❌ Erreur lors de la suppression des ambiances:", deleteAmbiancesError)
          throw deleteAmbiancesError
        }
        deletedAmbiancesCount = supabaseAmbiancesCount !== null ? supabaseAmbiancesCount : ambianceIdsToDelete.length
      }
    }

    // Étape 11: Nettoyer les genres Spotify orphelins
    if (initialAffectedSpotifyGenreIds.size > 0) {
      const { data: orphanedSpotifyGenres, error: fetchOrphanedSpotifyGenresError } = await supabase.rpc(
        "get_orphaned_spotify_genres",
        {
          p_spotify_genre_ids: Array.from(initialAffectedSpotifyGenreIds),
        },
      )

      if (fetchOrphanedSpotifyGenresError) {
        console.error(
          "❌ Erreur lors de la récupération des genres Spotify orphelins:",
          fetchOrphanedSpotifyGenresError,
        )
        throw fetchOrphanedSpotifyGenresError
      }

      const spotifyGenreIdsToDelete = orphanedSpotifyGenres.map((sg: { id: number }) => sg.id)

      if (spotifyGenreIdsToDelete.length > 0) {
        const { error: deleteSpotifyGenresError, count: supabaseSpotifyGenresCount } = await supabase
          .from("spotify_genres")
          .delete({ count: "exact" })
          .in("id", spotifyGenreIdsToDelete)

        if (deleteSpotifyGenresError) {
          console.error("❌ Erreur lors de la suppression des genres Spotify:", deleteSpotifyGenresError)
          throw deleteSpotifyGenresError
        }
        deletedSpotifyGenresCount =
          supabaseSpotifyGenresCount !== null ? supabaseSpotifyGenresCount : spotifyGenreIdsToDelete.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedListensCount} écoute(s), ${deletedTracksCount} titre(s), ${deletedAlbumsCount} album(s) et ${deletedArtistsCount} artiste(s) supprimé(s) avec succès.`,
      deletedListensCount,
      deletedTracksCount,
      deletedAlbumsCount,
      deletedArtistsCount,
      deletedGenresCount,
      deletedSubGenresCount,
      deletedAmbiancesCount,
      deletedSpotifyGenresCount,
    })
  } catch (error: any) {
    console.error("❌ Erreur lors de la suppression en masse avec nettoyage:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
