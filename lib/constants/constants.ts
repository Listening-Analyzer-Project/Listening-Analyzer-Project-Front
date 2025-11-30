import { ColumnOption } from "@/types";

export const COLUMNS_BY_VIEW: Record<string, ColumnOption[]> = {
    listens: [
        { key: 'ts', label: 'Date & Heure', description: 'Date et heure de l\'écoute', sortable: true },
        { key: 'title', label: 'Titre', description: 'Titre du morceau', sortable: true },
        { key: 'artist', label: 'Artiste', description: 'Artiste principal', sortable: true },
        { key: 'album', label: 'Album', description: 'Album du morceau', sortable: true },
        { key: 'msPlayed', label: 'Durée', description: 'Temps d\'écoute en secondes', sortable: true },
        { key: 'reasonEnd', label: 'Raison Fin', description: 'Pourquoi l\'écoute s\'est arrêtée', sortable: true },
        { key: 'isValid', label: 'Valide', description: 'Si l\'écoute est considérée comme valide (>= 30s)', sortable: true },
    ],
    tracks: [
        { key: 'rank_num', label: 'Rang', description: 'Classement basé sur le nombre d\'écoutes', sortable: true },
        { key: 'track_title', label: 'Titre', description: 'Titre du morceau', sortable: true },
        { key: 'album_title', label: 'Album', description: 'Album du morceau', sortable: true },
        { key: 'all_artists', label: 'Artistes', description: 'Tous les artistes participants', sortable: true },
        { key: 'genre_name', label: 'Genre', description: 'Genre musical principal', sortable: true },
        { key: 'valid_listens', label: 'Écoutes Valides', description: 'Nombre d\'écoutes supérieures à 30s', sortable: true },
        { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Nombre d\'écoutes inférieures à 30s', sortable: true },
    ],
    artists: [
        { key: 'rank_num', label: 'Rang', description: 'Classement de l\'artiste', sortable: true },
        { key: 'artist_name', label: 'Artiste', description: 'Nom de l\'artiste', sortable: true },
        { key: 'country_name', label: 'Pays', description: 'Pays d\'origine de l\'artiste', sortable: true },
        { key: 'genre_name', label: 'Genre', description: 'Genre principal de l\'artiste', sortable: true },
        { key: 'valid_listens', label: 'Écoutes Valides', description: 'Total des écoutes valides pour cet artiste', sortable: true },
        { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Total des écoutes invalides pour cet artiste', sortable: true },
    ],
    albums: [
        { key: 'rank_num', label: 'Rang', description: 'Classement de l\'album', sortable: true },
        { key: 'album_title', label: 'Album', description: 'Titre de l\'album', sortable: true },
        { key: 'release_date', label: 'Date de Sortie', description: 'Date de sortie de l\'album', sortable: true },
        { key: 'all_artists', label: 'Artistes', description: 'Artistes de l\'album', sortable: true },
        { key: 'valid_listens', label: 'Écoutes Valides', description: 'Total des écoutes valides pour cet album', sortable: true },
        { key: 'invalid_listens', label: 'Écoutes Invalides', description: 'Total des écoutes invalides pour cet album', sortable: true },
    ],
}
