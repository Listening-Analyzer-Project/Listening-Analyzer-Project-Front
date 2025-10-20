import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET /api/analytics/albums - VERSION SCALABLE AVEC FONCTION SQL

//------
// Objectif : Il permet de récupérer des statistiques complètes sur les albums (écoutes valides, invalides, total, artistes, date de sortie, etc.),
// Spécificité : iltrage, tri, pagination, et recherche textuelle — le tout exécuté directement en base PostgreSQL via une fonction SQL stockée.
// A ajouter : TODO
//------
// Si les tables listens deviennent énormes, remplacer COUNT() + OFFSET par une approche window function + keyset pagination pour de meilleures perfs.
// Ajouter un cache (Redis ou Supabase Edge Functions) pour éviter de recalculer les mêmes agrégations souvent.
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

    const { data, error } = await supabase.rpc("get_albums_analytics", {
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
      album_id: row.album_id,
      album_title: row.album_title,
      release_date: row.release_date, // Ajout de la date de sortie
      artists: row.artists,
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
    console.error("Error fetching albums analytics:", error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }
}
