'use client'

import { useMemo } from 'react'

import type { ViewState } from '@/lib/store'
import { getOrderedSelection } from '@/lib/store'
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

  const seen = new Set<number>()
  const userIds: number[] = []

  const expand = (id: string) => {
    const it = viewState.items[id]
    if (!it) return
    if (it.type === 'user' || it.type === 'alias') {
      if (!seen.has(it.userId)) {
        seen.add(it.userId)
        userIds.push(it.userId)
      }
    } else if (it.type === 'group') {
      for (const c of it.children) expand(c)
    }
  }

  for (const id of orderedSelectedIds) expand(id)

  if (userIds.length === 0) {
    const firstTop = viewState.order[0]
    if (firstTop) {
      const it = viewState.items[firstTop]
      if (it?.type === 'user' || it?.type === 'alias') userIds.push(it.userId)
      else if (it?.type === 'group') {
        const firstChild = it.children[0]
        const nested = viewState.items[firstChild]
        if (nested && (nested.type === 'user' || nested.type === 'alias'))
          userIds.push(nested.userId)
      }
    }
  }

  const displayCount = Math.min(userIds.length, max)
  const overflow = userIds.length > max

  const avatarItems = []
  for (let i = 0; i < displayCount; i++) {
    const uid = userIds[i]
    const user = usersById.get(uid)
    const name = user?.name ?? 'U'
    const initialsText = initials(name)
    const bg =
      colorMap?.get(String(uid)) ??
      (() => {
        const hue = (uid * 37) % 360
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
