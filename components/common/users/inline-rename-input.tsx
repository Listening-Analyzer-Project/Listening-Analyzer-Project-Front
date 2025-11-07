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

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.focus()
      el.select()
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
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => commit()}
      placeholder={placeholder ?? ''}
      className={`w-full rounded border px-2 py-1 text-sm ${className ?? ''}`}
    />
  )
}
