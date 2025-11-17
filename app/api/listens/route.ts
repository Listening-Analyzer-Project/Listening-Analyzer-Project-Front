import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateData, validations } from "@/lib/validations"

// GET /api/listens - VERSION AVEC VUE ANALYTICS

//------
// Objectif : Récupérer les écoutes depuis la vue analytics_listens, avec filtres avancés, recherche textuelle et pagination.
// Spécificité : beaucoup de spécificité relire la fonction.
// A ajouter : Done
//------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10000") // Augmenté à 10000
    const track_id = searchParams.get("track_id")
    const is_valid = searchParams.get("is_valid")
    const start_date = searchParams.get("start_date")
    const end_date = searchParams.get("end_date")
    const platform = searchParams.get("platform")
    const search = searchParams.get("search")

    const orderBy = searchParams.get("orderBy") || "ts"
    const orderDirection = searchParams.get("orderDirection") || "desc"

    const offset = (page - 1) * limit

    let listenIdsFromSearch: number[] | null = null

    // Recherche si nécessaire
    if (search) {
      const { data: rpcData, error: rpcError } = await supabase.rpc("search_listens", {
        p_search_term: search,
      })

      if (rpcError) {
        throw rpcError
      }
      listenIdsFromSearch = rpcData.map((item: any) =>
        typeof item === "object" && item !== null && "id" in item ? item.id : item,
      )
      if (listenIdsFromSearch.length === 0) {
        return NextResponse.json([], {
          headers: { "X-Total-Count": "0" },
        })
      }
    }

    // REQUÊTE PRINCIPALE sur la vue analytics_listens
    // On filtre sur artist_is_primary = true pour éviter les doublons d'artistes
    // let query = supabase.from("analytics_listens").select("*", { count: "exact" }).eq("artist_is_primary", true) // IMPORTANT : seulement l'artiste principal
    let query = supabase.from("analytics_listens").select("*", { count: "exact" })

    // Applique les filtres existants
    if (track_id) {
      query = query.eq("track_id", track_id)
    }
    if (is_valid !== null) {
      query = query.eq("is_valid", is_valid === "true")
    }
    if (platform) {
      query = query.eq("platform", platform)
    }
    if (start_date) {
      query = query.gte("ts", start_date)
    }
    if (end_date) {
      query = query.lte("ts", end_date)
    }

    // Applique le filtre de recherche
    if (listenIdsFromSearch !== null) {
      query = query.in("listen_id", listenIdsFromSearch)
    }

    // NOUVEAU SYSTÈME DE TRI - beaucoup plus simple !
    const ascending = orderDirection === "asc"

    switch (orderBy) {
      case "ts":
        query = query.order("ts", { ascending })
        break
      case "title":
        query = query.order("track_title", { ascending })
        break
      case "artist":
        query = query.order("primary_artist_name", { ascending }) // Changed to primary_artist_name
        break
      case "album":
        query = query.order("album_title", { ascending })
        break
      case "releaseDate":
        query = query.order("date_de_sortie", { ascending })
        break
      case "genre":
        query = query.order("style_musical", { ascending })
        break
      case "subGenre":
        query = query.order("sous_genre", { ascending })
        break
      case "ambiance":
        query = query.order("ambiance", { ascending })
        break
      case "country":
        query = query.order("primary_artist_country", { ascending }) // Changed to primary_artist_country
        break
      case "msPlayed":
        query = query.order("ms_played", { ascending })
        break
      case "reasonStart":
        query = query.order("reason_start", { ascending })
        break
      case "reasonEnd":
        query = query.order("reason_end", { ascending })
        break
      case "skipped":
        query = query.order("skipped", { ascending })
        break
      case "isValid":
        query = query.order("is_valid", { ascending })
        break
      case "platform":
        query = query.order("platform", { ascending })
        break
      default:
        query = query.order("ts", { ascending: false })
        break
    }

    const { data, error, count: totalCount } = await query.range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    const transformedData =
      data?.map((row) => ({
        id: row.listen_id,
        ts: row.ts,
        platform: row.platform,
        ms_played: row.ms_played,
        is_valid: row.is_valid,
        conn_country: row.listen_country_code,
        ip_addr: row.ip_addr,
        track_id: row.track_id,
        reason_start: row.reason_start,
        reason_end: row.reason_end,
        shuffle: row.shuffle,
        skipped: row.skipped,
        offline: row.offline,
        incognito_mode: row.incognito_mode,
        tracks: {
          id: row.track_id,
          title: row.track_title,
          albums: {
            id: row.album_id,
            title: row.album_title,
            release_date: row.date_de_sortie,
          },
          genres: row.genre_id
            ? {
                id: row.genre_id,
                name: row.style_musical,
              }
            : null,
          sub_genres: row.sub_genre_id
            ? {
                id: row.sub_genre_id,
                name: row.sous_genre,
              }
            : null,
          ambiances: row.ambiance_id
            ? {
                id: row.ambiance_id,
                name: row.ambiance,
              }
            : null,
          track_artists: row.all_track_artists || [], // Removed JSON.parse
        },
        primary_artist_id: row.primary_artist_id,
        primary_artist_name: row.primary_artist_name,
        primary_artist_country: row.primary_artist_country,
        primary_artist_spotify_genres: row.primary_artist_spotify_genres || [], // Removed JSON.parse
      })) || []

    return NextResponse.json(transformedData, {
      headers: {
        "X-Total-Count": totalCount ? totalCount.toString() : "0",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/listens


//------
// Objectif : Créer une nouvelle écoute.
// Spécificité : non
// A ajouter : non
//------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateData(body, validations.listen)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("listens")
      .insert([body])
      .select(
        `
        *,
        tracks (
          id,
          title,
          albums (
            id,
            title
          )
        )
      `,
      )
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
