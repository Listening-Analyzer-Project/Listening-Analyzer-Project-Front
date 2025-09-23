import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET /api/countries/ranked
export async function GET() {
  try {
    const { data, error } = await supabase.rpc("get_ranked_countries")

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching ranked countries:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
