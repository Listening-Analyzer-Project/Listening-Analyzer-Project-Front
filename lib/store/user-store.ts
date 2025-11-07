// TODO j'ai un use mais j'ai pas de set

import type { FUser } from '@/types'
import { createContext, useContext } from 'react'

type UserStore = {
  activeUser: FUser | null
  setActiveUser: (u: FUser | null) => void
  clearActiveUser: () => void
}

const UserContext = createContext<UserStore | undefined>(undefined)

export function useUserStore() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserStore must be used within <UserProvider>')
  return ctx
}
