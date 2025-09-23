import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/tracks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search")
    const album_id = searchParams.get("album_id")

    const offset = (page - 1) * limit

    let query = supabase
      .from("tracks")
      .select(`
        *,
        albums (
          id,
          title,
          release_date
        ),
        genres (
          id,
          name
        ),
        sub_genres (
          id,
          name
        ),
        ambiances (
          id,
          name
        ),
        track_artists (
          is_primary,
          artists (
            id,
            name
          )
        )
      `)
      .range(offset, offset + limit - 1)
      .order("title")

    if (search) {
      query = query.ilike("title", `%${search}%`)
    }

    if (album_id) {
      query = query.eq("album_id", album_id)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tracks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.track)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("tracks")
      .insert([body])
      .select(`
        *,
        albums (
          id,
          title,
          release_date
        ),
        genres (
          id,
          name
        ),
        sub_genres (
          id,
          name
        ),
        ambiances (
          id,
          name
        )
      `)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
