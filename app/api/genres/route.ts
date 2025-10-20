import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/genres

//------
// Objectif : Récupérer tous les genres avec leurs sous-genres liés.
// Spécificité : non
// A ajouter : TODO peu etre intéressant pas la grosse priorité
//------

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("genres")
      .select(`
        *,
        sub_genres (
          id,
          name
        )
      `)
      .order("name")

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/genres

//------
// Objectif : Créer un nouveau genre musical.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.genre)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase.from("genres").insert([body]).select().single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
