import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET /api/analytics/artists - VERSION SCALABLE AVEC FONCTION SQL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const search = searchParams.get("search") || null
    const orderBy = searchParams.get("orderBy") || "valid_listens"
    const orderDirection = searchParams.get("orderDirection") || "desc"

    const offset = (page - 1) * limit

    const { data, error } = await supabase.rpc("get_artists_analytics", {
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
      artist_id: row.artist_id,
      artist_name: row.artist_name,
      country_name: row.country_name,
      spotify_genres: row.spotify_genres_list, // Ajout du nom du pays
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
    console.error("Error fetching artists analytics:", error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }
}
