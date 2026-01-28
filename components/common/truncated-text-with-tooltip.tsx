import { useEffect, useRef, useState } from 'react'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

interface TruncatedTextWithTooltipProps {
  text: string | null | undefined
  className?: string
}

export function TruncatedTextWithTooltip({ text, className }: TruncatedTextWithTooltipProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  const content = text || ''

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkTruncation = () => {
      const truncated = element.scrollWidth > element.clientWidth
      if (truncated !== isTruncated) {
        setIsTruncated(truncated)
      }
    }

    const initialCheckTimeout = setTimeout(checkTruncation, 50)

    const resizeObserver = new ResizeObserver(entries => {
      requestAnimationFrame(() => {
        checkTruncation()
      })
    })

    resizeObserver.observe(element)

    return () => {
      clearTimeout(initialCheckTimeout)
      resizeObserver.disconnect()
    }
  }, [content, className, isTruncated])

  const truncatedElement = (
    <div
      ref={textRef}
      className={cn(
        'block w-full whitespace-nowrap overflow-hidden text-ellipsis min-w-0',
        className
      )}
    >
      {content}
    </div>
  )

  return (
    <TooltipProvider>
      {isTruncated ? (
        <Tooltip>
          <TooltipTrigger asChild>{truncatedElement}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{content}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        truncatedElement
      )}
    </TooltipProvider>
  )
}
