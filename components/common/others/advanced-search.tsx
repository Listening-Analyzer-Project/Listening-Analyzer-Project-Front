'use client'

import React, { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { formatDateForSearch } from '@/lib/utils/format-date'

interface AdvancedSearchProps {
  onSearchChange: (query: string) => void
  onSuggestionQueryChange: (query: string) => void
  suggestions: string[]
  suggestionsLoading: boolean
  loading?: boolean
}

type Operator = 'and' | 'or'

interface SearchTerm {
  display: string
  value: string
}

export function AdvancedSearch({
  onSearchChange,
  onSuggestionQueryChange,
  suggestions,
  suggestionsLoading,
  loading = false
}: AdvancedSearchProps) {
  const [localQuery, setLocalQuery] = useState('')
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Debounce pour les suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.length > 0) {
        onSuggestionQueryChange(localQuery)
        setIsPopoverOpen(true)
      } else {
        setIsPopoverOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, onSuggestionQueryChange])

  // Construire la requête finale
  const buildQueryString = (terms: SearchTerm[], ops: Operator[]): string => {
    if (terms.length === 0) return ''
    if (terms.length === 1) return terms[0].value

    let query = terms[0].value
    for (let i = 1; i < terms.length; i++) {
      const operator = ops[i - 1] === 'and' ? '+' : ' | '
      query += operator + terms[i].value
    }
    return query
  }

  // Ajouter un terme de recherche
  const addSearchTerm = (term: string) => {
    const cleanTerm = truncateSuggestion(term)
    const value = formatDateForSearch(cleanTerm)

    const newTerm: SearchTerm = { display: cleanTerm, value }
    const newTerms = [...searchTerms, newTerm]
    const newOperators = [...operators]
    
    if (searchTerms.length > 0) {
      newOperators.push('and')
    }

    setSearchTerms(newTerms)
    setOperators(newOperators)
    setLocalQuery('')
    setIsPopoverOpen(false)

    const queryString = buildQueryString(newTerms, newOperators)
    onSearchChange(queryString)
  }

  // Supprimer un terme
  const removeSearchTerm = (index: number) => {
    const newTerms = searchTerms.filter((_, i) => i !== index)
    let newOperators = [...operators]

    if (index > 0) {
      newOperators = operators.filter((_, i) => i !== index - 1)
    } else if (operators.length > 0) {
      newOperators = operators.slice(1)
    }

    setSearchTerms(newTerms)
    setOperators(newOperators)

    const queryString = buildQueryString(newTerms, newOperators)
    onSearchChange(queryString)
  }

  // Toggle AND/OR
  const toggleOperator = (index: number) => {
    const newOperators = [...operators]
    newOperators[index] = newOperators[index] === 'and' ? 'or' : 'and'
    setOperators(newOperators)

    const queryString = buildQueryString(searchTerms, newOperators)
    onSearchChange(queryString)
  }

  const truncateSuggestion = (suggestion: string): string => {
    const index = suggestion.indexOf('] ')
    return index !== -1 ? suggestion.substring(index + 2) : suggestion
  }

  const handleSubmit = () => {
    if (localQuery.trim()) {
      addSearchTerm(localQuery.trim())
    }
  }

  const handleSelectSuggestion = (suggestion: string) => {
    addSearchTerm(suggestion)
  }

  const handleClearAll = () => {
    setSearchTerms([])
    setOperators([])
    setLocalQuery('')
    onSearchChange('')
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isPopoverOpen && suggestions.length > 0}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Rechercher par titre, artiste..."
                value={localQuery}
                onChange={e => setLocalQuery(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                className="pl-3 pr-2 py-2 rounded-md border border-gray-300 focus:ring-0 focus:border-gray-400 w-full"
                disabled={loading}
              />
              {suggestionsLoading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-xs">...</span>
                </div>
              )}
            </div>
          </PopoverTrigger>

          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50">
            <div className="max-h-60 overflow-y-auto">
              {Array.isArray(suggestions) && suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <Search className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{suggestion}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          onClick={handleSubmit}
          className="bg-gray-800 text-white hover:bg-gray-700 rounded-md px-4 py-2 flex-shrink-0"
          disabled={loading || !localQuery.trim()}
        >
          Ajouter
        </Button>

        {(localQuery || searchTerms.length > 0) && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClearAll}
            className="rounded-md h-9 w-9 flex-shrink-0 bg-transparent"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searchTerms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
          {searchTerms.map((term, index) => (
            <React.Fragment key={index}>
              <div className="group relative flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors">
                <span>{term.display}</span>
                <button
                  onClick={() => removeSearchTerm(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                  title="Supprimer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {index < searchTerms.length - 1 && (
                <button
                  onClick={() => toggleOperator(index)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-semibold text-gray-700 transition-colors"
                  title="Cliquer pour changer l'opérateur"
                >
                  {operators[index] === 'and' ? 'AND' : 'OR'}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdvancedSearch