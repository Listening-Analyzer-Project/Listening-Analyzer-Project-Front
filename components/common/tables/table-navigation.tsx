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
    <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-background/80 border-t shadow-lg z-50">
      <div className={`container mx-auto py-2 ${className}`}>
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Page {currentPage} sur {totalPages || 0}
            </span>
            <span>-</span>
            <span>
              Affichage de {from <= to ? from : 0} à {Math.max(0, to)} sur {totalItems} données totales
            </span>
          </div>

          <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}

export default TableNavigation
