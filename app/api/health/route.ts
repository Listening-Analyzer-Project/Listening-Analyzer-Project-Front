import { NextResponse } from "next/server"

// GET /api/health - Vérification de l'état du serveur

//------
// Objectif : Vérifier l'état du serveur.
// Spécificité : non
// A ajouter : non
//------

export async function GET() {
  return NextResponse.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Spotify Analyzer API is running",
  })
}
