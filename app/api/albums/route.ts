import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/albums

//------
// Objectif : Récupérer une liste paginée d’albums depuis la table albums dans la base Supabase, avec leurs artistes associés.
// Spécificité : Quantité à récupérer + offset en fonction de la pagination + possibilité de recherche par titre d’album.
// A ajouter : non je pense que celui de analytics album devrait etre suffisant
//------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search")

    const offset = (page - 1) * limit

    let query = supabase
      .from("albums")
      .select(`
        *,
        album_artists (
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

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/albums

//------
// Objectif : Créer un nouvel album dans la table albums.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.album)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase.from("albums").insert([body]).select().single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
