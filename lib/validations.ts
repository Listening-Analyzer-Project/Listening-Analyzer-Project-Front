// Schémas de validation pour l'API
export const validations = {
  // Régions géographiques
  geographicalRegion: {
    name: { required: true, type: "string", maxLength: 255 },
  },

  // Pays
  country: {
    name: { required: true, type: "string", maxLength: 255 },
    region_id: { required: true, type: "number" },
  },

  // Artistes (pour la création, 'name' est requis)
  artist: {
    name: { required: true, type: "string", maxLength: 255 },
    spotify_uri: { required: false, type: "string" },
    popularity: { required: false, type: "number", min: 0, max: 100 },
    country_id: { required: false, type: "number" },
  },

  // Artistes pour la mise à jour (seuls les champs fournis sont validés, 'name' n'est pas requis)
  artistUpdate: {
    name: { required: false, type: "string", maxLength: 255 }, // Rendu non requis pour la mise à jour
    spotify_uri: { required: false, type: "string" },
    popularity: { required: false, type: "number", min: 0, max: 100 },
    country_id: { required: false, type: "number" },
  },

  // Genres
  genre: {
    name: { required: true, type: "string", maxLength: 255 },
  },

  // Sous-genres
  subGenre: {
    name: { required: true, type: "string", maxLength: 255 },
    genre_id: { required: true, type: "number" },
  },

  // Ambiances
  ambiance: {
    name: { required: true, type: "string", maxLength: 255 },
  },

  // Albums
  album: {
    title: { required: true, type: "string", maxLength: 255 },
    release_date: { required: false, type: "date" },
    spotify_uri: { required: false, type: "string" },
    popularity: { required: false, type: "number", min: 0, max: 100 },
  },

  // Tracks
  track: {
    title: { required: true, type: "string", maxLength: 255 },
    duration_ms: { required: true, type: "number", min: 0 },
    album_id: { required: true, type: "number" },
    spotify_uri: { required: true, type: "string" },
    explicit: { required: false, type: "boolean", default: false },
    popularity: { required: false, type: "number", min: 0, max: 100 },
    genre_id: { required: false, type: "number" },
    sub_genre_id: { required: false, type: "number" },
    ambiance_id: { required: false, type: "number" },
    // Audio features
    acousticness: { required: false, type: "number", min: 0, max: 1 },
    danceability: { required: false, type: "number", min: 0, max: 1 },
    energy: { required: false, type: "number", min: 0, max: 1 },
    instrumentalness: { required: false, type: "number", min: 0, max: 1 },
    key: { required: false, type: "number", min: 0, max: 11 },
    liveness: { required: false, type: "number", min: 0, max: 1 },
    loudness: { required: false, type: "number" },
    mode: { required: false, type: "number", enum: [0, 1] },
    speechiness: { required: false, type: "number", min: 0, max: 1 },
    tempo: { required: false, type: "number", min: 0 },
    time_signature: { required: false, type: "number", min: 1 },
    valence: { required: false, type: "number", min: 0, max: 1 },
  },

  // Écoutes
  listen: {
    ts: { required: true, type: "date" },
    platform: { required: true, type: "string" },
    ms_played: { required: true, type: "number", min: 0 },
    is_valid: { required: true, type: "boolean" },
    conn_country: { required: true, type: "string", maxLength: 2 },
    ip_addr: { required: false, type: "string" },
    track_id: { required: true, type: "number" },
    reason_start: { required: true, type: "string" },
    reason_end: { required: true, type: "string" },
    shuffle: { required: true, type: "boolean" },
    skipped: { required: true, type: "boolean" },
    offline: { required: true, type: "boolean" },
    incognito_mode: { required: true, type: "boolean" },
  },

  // Catégories
  category: {
    name: { required: true, type: "string", maxLength: 255 },
  },

  // Sous-catégories
  subcategory: {
    name: { required: true, type: "string", maxLength: 255 },
    category_id: { required: true, type: "number" },
  },

  // Événements
  event: {
    start_date: { required: true, type: "date" },
    end_date: { required: true, type: "date" },
    category_id: { required: true, type: "number" },
    subcategory_id: { required: false, type: "number" },
    description: { required: false, type: "string" },
  },
}

// Fonction de validation simple
export function validateData(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    const fieldRules = rules as any

    // Vérifier si requis
    if (fieldRules.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field} is required`)
      continue
    }

    // Si pas de valeur et pas requis, passer
    if (value === undefined || value === null || value === "") {
      continue
    }

    // Vérifier le type
    if (fieldRules.type === "string" && typeof value !== "string") {
      errors.push(`${field} must be a string`)
    }

    if (fieldRules.type === "number" && typeof value !== "number") {
      errors.push(`${field} must be a number`)
    }

    if (fieldRules.type === "boolean" && typeof value !== "boolean") {
      errors.push(`${field} must be a boolean`)
    }

    // Vérifier la longueur max
    if (fieldRules.maxLength && typeof value === "string" && value.length > fieldRules.maxLength) {
      errors.push(`${field} must be less than ${fieldRules.maxLength} characters`)
    }

    // Vérifier min/max pour les nombres
    if (fieldRules.min !== undefined && typeof value === "number" && value < fieldRules.min) {
      errors.push(`${field} must be at least ${fieldRules.min}`)
    }

    if (fieldRules.max !== undefined && typeof value === "number" && value > fieldRules.max) {
      errors.push(`${field} must be at most ${fieldRules.max}`)
    }

    // Vérifier enum
    if (fieldRules.enum && !fieldRules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${fieldRules.enum.join(", ")}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
