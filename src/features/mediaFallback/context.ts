import {createContext, useContext, useState} from 'react'

import {MediaFallbackSession} from './session'

export const MediaFallbackContext = createContext(
  new MediaFallbackSession(undefined, false),
)

export function useMediaFallbackSession() {
  return useContext(MediaFallbackContext)
}

export function useAccountMediaSession(
  did: string | undefined,
  enabled: boolean,
) {
  const [session, setSession] = useState(
    () => new MediaFallbackSession(did, enabled),
  )
  if (session.did === did && session.enabled === enabled) return session
  const next = new MediaFallbackSession(did, enabled)
  setSession(next)
  return next
}
