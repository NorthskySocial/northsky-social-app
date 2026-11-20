import {createContext, useContext, useMemo, useState} from 'react'

import {MediaFallbackSession} from './session'

export const MediaFallbackContext = createContext<MediaFallbackSession | null>(
  null,
)

export function useMediaFallbackSession() {
  const session = useContext(MediaFallbackContext)
  const [local] = useState(() => session ?? new MediaFallbackSession())
  return session ?? local
}

/** Retire the old preference object so late transfers can only update their own session. */
export function useAccountMediaSession(did: string | undefined) {
  return useMemo(() => new MediaFallbackSession(did), [did])
}
