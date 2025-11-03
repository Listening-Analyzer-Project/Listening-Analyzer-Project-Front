'use client'

import { Button } from '@/components/ui/button'

export interface TableNavigationProps {
  currentPage: number
  totalPages: number
  from: number
  to: number
  totalItems: number
  loading?: boolean
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  className?: string
}

export function TableNavigation({
  currentPage,
  totalPages,
  from,
  to,
  totalItems,
  loading = false,
  onFirst,
  onPrev,
  onNext,
  onLast,
  className = '',
}: TableNavigationProps) {
  return (
    <div className={`flex flex-col items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <div className="flex items-center gap-2 text-center">
        <span>
          Page {currentPage} sur {totalPages || 0}
        </span>
        <span>-</span>
        <span>
          Affichage de {from <= to ? from : 0} à {Math.max(0, to)} sur {totalItems} données totales
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onFirst}
          disabled={currentPage === 1 || loading}
        >
          Début
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentPage === 1 || loading}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage === totalPages || loading || totalPages === 0}
        >
          Suivant
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLast}
          disabled={currentPage === totalPages || loading || totalPages === 0}
        >
          Fin
        </Button>
      </div>
    </div>
  )
}

export default TableNavigation
