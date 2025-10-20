import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/sub-genres

//------
// Objectif : Récupérer les sous-genres, éventuellement filtrés par genre.
// Spécificité : oui, possibilité de filtrer par genre via un paramètre de requête.
// A ajouter : non
//------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre_id = searchParams.get("genre_id")

    let query = supabase
      .from("sub_genres")
      .select(`
        *,
        genres (
          id,
          name
        )
      `)
      .order("name")

    if (genre_id) {
      query = query.eq("genre_id", genre_id)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/sub-genres

//------
// Objectif : Créer un nouveau sous-genre.
// Spécificité : oui, validation des données avant insertion.
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.subGenre)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("sub_genres")
      .insert([body])
      .select(`
        *,
        genres (
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
