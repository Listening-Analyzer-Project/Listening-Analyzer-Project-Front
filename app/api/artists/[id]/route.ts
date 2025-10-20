import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/artists/[id]

//------
// Objectif : get par id
// Spécificité : non
// A ajouter : non
//------

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("artists").select("*").eq("id", params.id).single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Artist not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/artists/[id]

//------
// Objectif : modifier par id
// Spécificité : non
// A ajouter : non
//------

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    // Utiliser le nouveau schéma de validation pour la mise à jour
    const validation = validateData(body, validations.artistUpdate)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase.from("artists").update(body).eq("id", params.id).select().single()

    if (error) {
      throw error
    }
    if (!data) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/artists/[id]

//------
// Objectif : supprimer par id
// Spécificité : non
// A ajouter : non
//------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from("artists").delete().eq("id", params.id)

    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
