import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/spotify-genres

//------
// Objectif : Récupérer la liste des genres Spotify.
// Spécificité : non
// A ajouter : non
//------

export async function GET() {
  try {
    const { data, error } = await supabase.from("spotify_genres").select("*").order("name")

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/spotify-genres

//------
// Objectif : Ajouter un nouveau genre Spotify.
// Spécificité : validation des données avant insertion.
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.genre)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase.from("spotify_genres").insert([body]).select().single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
