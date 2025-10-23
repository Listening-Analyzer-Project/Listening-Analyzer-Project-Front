import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/events

//------
// Objectif : Récupérer les événements avec filtres possibles (category_id, start_date, end_date) et relations categories et subcategories.
// Spécificité : non
// A ajouter : DONE pour la liaison avec categories plus pour le trie par date (plus de subcategory)
//------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const category_id = searchParams.get("category_id")
    const start_date = searchParams.get("start_date")
    const end_date = searchParams.get("end_date")

    const offset = (page - 1) * limit

    let query = supabase
      .from("events")
      .select(`
        *,
        categories (
          id,
          name
        ),
        subcategories (
          id,
          name
        )
      `)
      .range(offset, offset + limit - 1)
      .order("start_date", { ascending: false })

    if (category_id) {
      query = query.eq("category_id", category_id)
    }

    if (start_date) {
      query = query.gte("start_date", start_date)
    }

    if (end_date) {
      query = query.lte("end_date", end_date)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/events

//------
// Objectif : Créer un nouvel événement dans la table events.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.event)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("events")
      .insert([body])
      .select(`
        *,
        categories (
          id,
          name
        ),
        subcategories (
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
