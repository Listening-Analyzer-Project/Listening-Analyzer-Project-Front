import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/ambiances

//------
// Objectif : Récupérer toutes les ambiances stockées dans la table ambiances.
// Spécificité : Trier les ambiances par nom.
// A ajouter : non
//------

export async function GET() {
  try {
    const { data, error } = await supabase.from("ambiances").select("*").order("name")

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/ambiances

//------
// Objectif : Créer une nouvelle ambiance dans la table ambiances.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.ambiance)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase.from("ambiances").insert([body]).select().single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
