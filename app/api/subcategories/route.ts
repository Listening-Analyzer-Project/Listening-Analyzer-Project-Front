import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/subcategories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category_id = searchParams.get("category_id")

    let query = supabase
      .from("subcategories")
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .order("name")

    if (category_id) {
      query = query.eq("category_id", category_id)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/subcategories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.subcategory)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("subcategories")
      .insert([body])
      .select(`
        *,
        categories (
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
