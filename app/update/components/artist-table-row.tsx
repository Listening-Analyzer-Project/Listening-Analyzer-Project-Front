'use client'

import { TruncatedTextWithTooltip } from '@/components/common/truncated-text-with-tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { Save, Search, XCircle } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

interface ArtistAnalytics {
  artist_id: number
  artist_name: string
  country_name: string | null
  country_id: number | null
  spotify_genres: string | null
  valid_listens: number
  invalid_listens: number
  rank: number
}

interface Country {
  id: number
  name: string
  usage_count: number
}

interface ArtistTableRowProps {
  artist: ArtistAnalytics
  countries: Country[]
  loading: boolean
  onSave: (artistId: number, countryId: number | null) => Promise<boolean>
  onModifiedChange: (artistId: number, newCountryId: number | null, isModified: boolean) => void
}

export const ArtistTableRow = React.memo(
  ({ artist, countries, loading, onSave, onModifiedChange }: ArtistTableRowProps) => {
    const [localSelectedCountryId, setLocalSelectedCountryId] = useState<number | null>(
      artist.country_id
    )
    const [countrySearchTerm, setCountrySearchTerm] = useState<string>('')
    const debouncedCountrySearchTerm = useDebounce(countrySearchTerm, 300)

    useEffect(() => {
      // Mettre à jour l'état local UNIQUEMENT si la prop 'artist.country_id' change.
      // Cela se produit lors du chargement initial ou après une sauvegarde réussie qui met à jour les données parentes.
      // Cela empêche l'état local d'être réinitialisé par les interactions de l'utilisateur.
      setLocalSelectedCountryId(artist.country_id)
      // Notifier le parent que cette ligne n'est plus modifiée (utile après une sauvegarde)
      onModifiedChange(artist.artist_id, artist.country_id, false)
    }, [artist.country_id, artist.artist_id, onModifiedChange])

    const isModified = localSelectedCountryId !== artist.country_id

    const handleLocalCountryChange = useCallback(
      (value: string) => {
        const newCountryId = value === 'null' ? null : Number(value)
        setLocalSelectedCountryId(newCountryId)
        onModifiedChange(artist.artist_id, newCountryId, newCountryId !== artist.country_id)
      },
      [artist.artist_id, artist.country_id, onModifiedChange]
    )

    const handleLocalSave = useCallback(async () => {
      const success = await onSave(artist.artist_id, localSelectedCountryId)
      // Si la sauvegarde réussit, le `useEffect` ci-dessus sera déclenché par la mise à jour de `artist.country_id`
      // dans le composant parent, ce qui réinitialisera correctement l'état local et le statut "modifié".
    }, [artist.artist_id, localSelectedCountryId, onSave])

    const handleLocalCancel = useCallback(() => {
      setLocalSelectedCountryId(artist.country_id)
      onModifiedChange(artist.artist_id, artist.country_id, false)
    }, [artist.artist_id, artist.country_id, onModifiedChange])

    const selectedCountryName =
      localSelectedCountryId === null
        ? 'N/A'
        : countries.find(c => c.id === localSelectedCountryId)?.name || artist.country_name || 'N/A'

    const countriesForDropdown = useMemo(() => {
      // Filter based on search term
      let filtered = countries.filter(country =>
        country.name.toLowerCase().includes(debouncedCountrySearchTerm.toLowerCase())
      )

      // If a country is currently selected and it's not in the filtered list, add it to the top
      if (localSelectedCountryId !== null) {
        const currentCountry = countries.find(c => c.id === localSelectedCountryId)
        if (currentCountry && !filtered.some(c => c.id === localSelectedCountryId)) {
          // Add to the beginning if not already present
          filtered = [currentCountry, ...filtered]
        }
      }

      // IMPORTANT: Do NOT re-sort here. The 'countries' prop is already pre-sorted by the SQL function.
      return filtered
    }, [countries, debouncedCountrySearchTerm, localSelectedCountryId])

    return (
      <TableRow key={artist.artist_id}>
        <TableCell className="w-[60px] py-1">
          <span className="text-xs font-medium text-gray-700">{artist.rank}</span>
        </TableCell>
        <TableCell className="w-[100px] py-1">
          <span className="text-xs font-medium text-green-600">
            {artist.valid_listens.toLocaleString()}
          </span>
        </TableCell>
        <TableCell className="w-[100px] py-1">
          <span className="text-xs text-red-600">{artist.invalid_listens.toLocaleString()}</span>
        </TableCell>
        <TableCell className="w-[180px] py-1">
          <TruncatedTextWithTooltip text={artist.artist_name} className="text-xs font-medium" />
        </TableCell>
        <TableCell className="w-[160px] py-1">
          {countries.length > 0 ? ( // Render Select only when countries are loaded
            <Select
              key={artist.artist_id} // Garder cette clé sur le Select lui-même pour qu'il se re-rende si l'artiste change
              value={localSelectedCountryId?.toString() || 'null'}
              onValueChange={handleLocalCountryChange}
              disabled={loading}
            >
              <SelectTrigger
                className={cn(
                  'h-7 text-xs',
                  isModified && 'bg-purple-100 text-purple-800 border-purple-300'
                )}
              >
                <SelectValue>{selectedCountryName}</SelectValue>
              </SelectTrigger>
              {/* Ajout d'une clé au SelectContent pour forcer le re-rendu lorsque les pays sont chargés */}
              <SelectContent
                className="max-h-[200px]"
                key={countries.length > 0 ? 'countries-loaded' : 'countries-loading'}
              >
                <div className="relative px-2 py-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Rechercher un pays..."
                    className="pl-8 h-8 text-xs"
                    value={countrySearchTerm}
                    onChange={e => setCountrySearchTerm(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  />
                </div>
                <SelectItem value="null">N/A</SelectItem>
                {countriesForDropdown.map(country => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
                {countriesForDropdown.length === 0 && countrySearchTerm.length > 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Aucun résultat.</div>
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-7 flex items-center text-xs text-muted-foreground">
              Chargement pays...
            </div> // Placeholder pendant le chargement
          )}
        </TableCell>
        <TableCell className="w-[160px] py-1">
          <TruncatedTextWithTooltip
            text={artist.spotify_genres || 'N/A'}
            className="text-xs text-gray-600"
          />
        </TableCell>
        <TableCell className="w-[100px] py-1">
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLocalSave}
              disabled={!isModified || loading}
              className="h-7 w-7"
            >
              <Save className="h-4 w-4 text-green-600" />
              <span className="sr-only">Enregistrer</span>
            </Button>
            {isModified && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLocalCancel}
                disabled={loading}
                className="h-7 w-7"
              >
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="sr-only">Annuler</span>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  },
  (prevProps, nextProps) => {
    // Comparaison personnalisée pour React.memo
    // Ne re-rendre que si les props pertinentes ont changé
    const artistDataChanged =
      prevProps.artist.artist_id !== nextProps.artist.artist_id ||
      prevProps.artist.artist_name !== nextProps.artist.artist_name ||
      prevProps.artist.country_id !== nextProps.artist.country_id || // L'ID du pays est crucial
      prevProps.artist.country_name !== nextProps.artist.country_name ||
      prevProps.artist.spotify_genres !== nextProps.artist.spotify_genres ||
      prevProps.artist.valid_listens !== nextProps.artist.valid_listens ||
      prevProps.artist.invalid_listens !== nextProps.artist.invalid_listens ||
      prevProps.artist.rank !== nextProps.artist.rank

    const loadingChanged = prevProps.loading !== nextProps.loading

    // Comparer la référence de l'array 'countries'.
    // Puisque 'countries' est maintenant chargé une seule fois, sa référence devrait être stable.
    // Si elle change, c'est qu'il y a eu un rechargement global des pays (rare), et il faut re-rendre.
    const countriesChanged = prevProps.countries !== nextProps.countries

    // Retourne true si les props sont identiques (pas de re-rendu), false sinon (re-rendu)
    return !artistDataChanged && !loadingChanged && !countriesChanged
  }
)

ArtistTableRow.displayName = 'ArtistTableRow'
