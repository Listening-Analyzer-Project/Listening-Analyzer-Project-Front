import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET /api/countries/ranked

//------
// Objectif : Récupère une liste de pays classés selon leur utilisation (nombre d’artistes) et tri alphabétique.
// Spécificité : Retourner les pays priorisés pour affichage, en combinant : Pays avec le plus d’artistes (top 5) / Autres pays avec artistes / Pays sans artistes
// A ajouter : Done
//------

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
