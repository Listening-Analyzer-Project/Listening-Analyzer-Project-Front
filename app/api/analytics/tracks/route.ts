import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET /api/analytics/tracks - VERSION SCALABLE AVEC FONCTION SQL

//------
// Objectif : Ce endpoint fournit des statistiques sur les tracks Il regroupe pour chaque titre : ses métadonnées (titre, album, artistes, genre, sous-genre, ambiance) /
// le nombre d’écoutes valides / invalides / totales,
// ainsi qu’un rang dynamique calculé selon un critère choisi (ex. : nombre d’écoutes valides).
// Spécificité : COmme les autre prend limit une search le orderby etc
// A ajouter : TODO
//------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const search = searchParams.get("search") || null
    const orderBy = searchParams.get("orderBy") || "valid_listens"
    const orderDirection = searchParams.get("orderDirection") || "desc"

    const offset = (page - 1) * limit

    const { data, error } = await supabase.rpc("get_tracks_analytics", {
      p_search: search,
      p_limit: limit,
      p_offset: offset,
      p_order_by: orderBy,
      p_order_direction: orderDirection,
    })

    if (error) {
      throw error
    }

    const results = data || []
    const totalCount = results.length > 0 ? results[0].total_count : 0

    const transformedResults = results.map((row: any) => ({
      track_id: row.track_id,
      track_title: row.track_title,
      album_title: row.album_title,
      artists: row.artists,
      genre_name: row.genre_name, // Ajout du nom du genre
      sub_genre_name: row.sub_genre_name, // Ajout du nom du sous-genre
      ambiance_name: row.ambiance_name, // Ajout du nom de l'ambiance
      valid_listens: Number(row.valid_listens),
      invalid_listens: Number(row.invalid_listens),
      total_listens: Number(row.total_listens),
      rank: Number(row.rank_num), // Ajout du rang
    }))

    return NextResponse.json(transformedResults, {
      headers: {
        "X-Total-Count": totalCount.toString(),
      },
    })
  } catch (error: any) {
    console.error("Error fetching tracks analytics:", error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }
}
