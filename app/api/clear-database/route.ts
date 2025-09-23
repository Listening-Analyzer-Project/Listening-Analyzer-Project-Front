import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST /api/clear-database - Vider la base de données (sauf tables de référence)
export async function POST() {
  try {
    // Tables avec clé primaire simple (ont une colonne id) - SANS les tables de référence
    const tablesWithId = [
      "listens",
      "tracks",
      "albums",
      "artists",
      "sub_genres",
      "genres",
      "spotify_genres",
      "ambiances",
    ]

    // Tables de liaison (clés primaires composites, pas de colonne id)
    const linkingTables = ["track_artists", "album_artists", "artist_spotify_genres"]

    let totalDeleted = 0

    // 1. Vider les tables de liaison en premier (pas de colonne id)
    for (const table of linkingTables) {
      const { error, count } = await supabase.from(table).delete().gte("artist_id", 0) // Condition toujours vraie

      if (error) {
        // console.error(`❌ Erreur lors du vidage de ${table}:`, error)
      } else {
        totalDeleted += count || 0
      }
    }

    // 2. Vider les tables avec id (SANS les tables de référence)
    for (const table of tablesWithId) {
      const { error, count } = await supabase.from(table).delete().gte("id", 0) // Condition toujours vraie

      if (error) {
        // console.error(`❌ Erreur lors du vidage de ${table}:`, error)
      } else {
        totalDeleted += count || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: `Base de données vidée avec succès (tables de référence préservées)`,
      tablesCleared: tablesWithId.length + linkingTables.length,
      tablesPreserved: ["countries", "geographical_regions", "events", "categories", "subcategories"],
      totalDeleted,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
