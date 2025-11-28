'use client'

import { useMemo } from 'react'

import type { ViewState } from '@/lib/store'
import { getOrderedSelection, isGroup, isItem } from '@/lib/store'
import type { FUser } from '@/types'

function initials(name = '') {
  return name
    .split(' ')
    .map(s => (s ? s[0] : ''))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AvatarStack({
  selectedIds,
  viewState,
  usersById,
  colorMap,
  max = 3,
  size = 34,
}: {
  selectedIds: string[]
  viewState: ViewState
  usersById: Map<number, FUser>
  colorMap?: Map<string, string>
  max?: number
  size?: number
}) {
  const orderedSelectedIds = useMemo(() => {
    return getOrderedSelection(selectedIds, viewState)
  }, [selectedIds, viewState])

  const seen = new Set<string>()
  const itemsToShow: { name: string; color?: string; id: string }[] = []

  const processItem = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    
    const it = viewState.items[id]
    if (!it) return

    if (isItem(it)) {
      const user = usersById.get(it.userId)
      itemsToShow.push({
        name: user?.name ?? 'User',
        color: colorMap?.get(id) ?? colorMap?.get(String(it.userId)),
        id: id
      })
    } else if (isGroup(it)) {
      itemsToShow.push({
        name: it.name ?? 'Group',
        color: colorMap?.get(id),
        id: id
      })
    }
  }

  for (const id of orderedSelectedIds) processItem(id)

  if (itemsToShow.length === 0) {
    // Fallback logic if nothing selected (show first item)
    const firstTop = viewState.order[0]
    if (firstTop) processItem(firstTop)
  }

  const displayCount = Math.min(itemsToShow.length, max)
  const overflow = itemsToShow.length > max

  const avatarItems = []
  for (let i = 0; i < displayCount; i++) {
    const item = itemsToShow[i]
    const initialsText = initials(item.name)
    const bg =
      item.color ??
      (() => {
        // Fallback color generation if map missing
        // simple hash from string id
        let hash = 0
        for (let j = 0; j < item.id.length; j++) {
          hash = item.id.charCodeAt(j) + ((hash << 5) - hash)
        }
        const hue = Math.abs(hash % 360)
        return `hsl(${hue} 60% 40%)`
      })()
    avatarItems.push({ initialsText, bg })
  }

  const avatarSize = size
  const offsetLeft = Math.round(avatarSize * 0.85)
  const offsetTop = 0

  return (
    <div
      style={{
        width: avatarSize + (displayCount - 1) * (avatarSize - offsetLeft),
        height: avatarSize,
      }}
      className="relative"
    >
      {avatarItems.map((a, idx) => {
        const left = idx * (avatarSize - offsetLeft)
        const top = -idx * offsetTop

        return (
          <div
            key={idx}
            style={{
              left,
              top,
              width: avatarSize,
              height: avatarSize,
              borderRadius: '9999px',
              background: a.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              position: 'absolute',
              boxShadow: '-1px 1px 3px rgba(0,0,0,0.30)',
              border: '1px solid white',
            }}
          >
            <span style={{ fontSize: Math.round(avatarSize / 2.5) }}>{a.initialsText}</span>
          </div>
        )
      })}
      {overflow && (
        <div
          style={{
            left: displayCount * (avatarSize - offsetLeft) - (avatarSize - offsetLeft),
            top: -(displayCount - 1) * offsetTop,
            width: avatarSize,
            height: avatarSize,
            borderRadius: '9999px',
            background: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            position: 'absolute',
            boxShadow: '-1px 1px 3px rgba(0,0,0,0.30)',
            zIndex: 0,
            border: '1px solid white',
          }}
        >
          <span style={{ fontSize: Math.round(avatarSize / 2.8) }}>...</span>
        </div>
      )}
    </div>
  )
}
