import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// POST /api/listens/bulk - Pour l'import en masse
export async function POST(request: NextRequest) {
  try {
    const { listens } = await request.json()

    if (!Array.isArray(listens)) {
      return NextResponse.json({ error: "listens must be an array" }, { status: 400 })
    }

    // Valider chaque écoute
    for (const listen of listens) {
      const validation = validateData(listen, validations.listen)
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: `Validation error: ${validation.errors.join(", ")}`,
          },
          { status: 400 },
        )
      }
    }

    const { data, error } = await supabase.from("listens").insert(listens).select("id")

    if (error) throw error

    return NextResponse.json(
      {
        message: `${data.length} listens created successfully`,
        created_ids: data.map((item) => item.id),
      },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
