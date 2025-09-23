import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/artists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search")

    const offset = (page - 1) * limit

    let query = supabase
      .from("artists")
      .select(`
        *,
        countries (
          id,
          name,
          geographical_regions (
            id,
            name
          )
        )
      `)
      .range(offset, offset + limit - 1)
      .order("name")

    if (search) {
      query = query.ilike("name", `%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/artists
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.artist)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("artists")
      .insert([body])
      .select(`
        *,
        countries (
          id,
          name,
          geographical_regions (
            id,
            name
          )
        )
      `)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
