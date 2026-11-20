import {useMemo, useState} from 'react'

import {useMediaFallbackSession} from './context'
import {fallbackMediaUrl} from './routing'
import {type MediaFallbackSession} from './session'

export function useMediaFallback(uri: string) {
  const session = useMediaFallbackSession()
  // Keep an already playing stream stable when another view discovers a fallback.
  const initial = useMemo(() => session.preferredUrl(uri), [uri, session])
  const [failed, setFailed] = useState<{
    uri: string
    session: MediaFallbackSession
  }>()
  const alternate = fallbackMediaUrl(uri)
  const usingFallback =
    ((failed?.uri === uri && failed.session === session) || initial !== uri) &&
    !!alternate
  return {
    uri: usingFallback ? alternate : uri,
    loaded() {
      if (usingFallback) session.rememberRead(uri)
    },
    retry() {
      if (!alternate || usingFallback) return false
      setFailed({uri, session})
      return true
    },
  }
}
