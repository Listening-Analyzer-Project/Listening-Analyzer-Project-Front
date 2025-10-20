import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/countries

//------
// Objectif : Récupérer toutes les entrées de la table countries avec leurs geographical_regions.
// Spécificité : non
// A ajouter : TODO
//------

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("countries")
      .select(`
        *,
        geographical_regions (
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

// POST /api/countries

//------
// Objectif : Créer un nouveau pays dans la table countries.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.country)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("countries")
      .insert([body])
      .select(`
        *,
        geographical_regions (
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
