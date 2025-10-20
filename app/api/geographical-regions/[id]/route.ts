import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/geographical-regions/[id]

//------
// Objectif : Récupérer une région par son id.
// Spécificité : non
// A ajouter : non
//------

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("geographical_regions").select("*").eq("id", params.id).single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Region not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/geographical-regions/[id]

//------
// Objectif : Mettre à jour une région existante.
// Spécificité : non
// A ajouter : non
//------

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.geographicalRegion)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("geographical_regions")
      .update(body)
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Region not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/geographical-regions/[id]

//------
// Objectif : Supprimer une région par son id.
// Spécificité : non
// A ajouter : non
//------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from("geographical_regions").delete().eq("id", params.id)

    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
