'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'

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
  onPageChange?: (page: number) => void
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
  onPageChange,
  className = '',
}: TableNavigationProps) {
  const [inputValue, setInputValue] = useState(String(currentPage))

  useEffect(() => {
    setInputValue(String(currentPage))
  }, [currentPage])

  const handlePageChange = () => {
    let page = parseInt(inputValue, 10)
    if (isNaN(page)) {
      page = currentPage
    } else if (page < 1) {
      page = 1
    } else if (page > totalPages) {
      page = totalPages
    }

    setInputValue(String(page))
    if (page !== currentPage && onPageChange) {
      onPageChange(page)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handlePageChange()
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-background/80 border-t shadow-lg z-40">
      <div className={`container mx-auto py-2 px-4 ${className}`}>
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Page</span>
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handlePageChange}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                disabled={loading}
                className="h-7 w-[50px] px-1 py-0 text-center border-foreground/30 focus:border-ring bg-transparent"
                style={{ width: `${Math.max(2, inputValue.length + 1)}ch` }}
            />
            <span>
              of {totalPages || 0}
            </span>
            <span className="mx-2 text-muted-foreground/30">|</span>
            <span>
              Showing {from <= to ? from : 0} to {Math.max(0, to)} of {totalItems} total entries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFirst}
              disabled={currentPage === 1 || loading}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={currentPage === totalPages || loading || totalPages === 0}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLast}
              disabled={currentPage === totalPages || loading || totalPages === 0}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableNavigation
