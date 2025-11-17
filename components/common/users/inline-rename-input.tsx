'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function InlineRenameInput({
  initialValue,
  onSave,
  onCancel,
  className,
  placeholder,
}: {
  initialValue: string
  onSave: (v: string) => void
  onCancel: () => void
  className?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blurTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      // Solution simple avec délai + fallback
      const attemptFocus = () => {
        if (document.contains(el)) {
          el.focus()
          el.select()

          // Vérification et retry si nécessaire
          if (document.activeElement !== el) {
            setTimeout(() => {
              if (document.contains(el)) {
                el.focus()
                el.select()
              }
            }, 50)
          }
        }
      }

      // Premier essai après délai court
      const timer1 = setTimeout(attemptFocus, 150)

      // Fallback après délai plus long
      const timer2 = setTimeout(() => {
        if (document.contains(el) && document.activeElement !== el) {
          el.focus()
          el.select()
        }
      }, 300)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current)
          blurTimeoutRef.current = null
        }
      }
    }

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
    }
  }, [])

  const commit = () => {
    const trimmed = (value ?? '').trim()
    if (!trimmed) {
      onCancel()
      return
    }
    if (trimmed === (initialValue ?? '').trim()) {
      onCancel()
      return
    }
    onSave(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // cancel any pending blur-commit
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
      onCancel()
    }
  }

  const handleBlur = () => {
    // schedule commit slightly in the future to allow focus transitions to settle
    // and to allow the input to regain focus if needed.
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    // 100ms is conservative but safe; you can reduce to 30ms if you prefer.
    blurTimeoutRef.current = window.setTimeout(() => {
      blurTimeoutRef.current = null
      commit()
    }, 100)
  }

  const handleFocus = () => {
    // if focus comes back, cancel the pending blur->commit
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder ?? ''}
      className={`w-full rounded border px-2 py-1 text-sm ${className ?? ''}`}
    />
  )
}
