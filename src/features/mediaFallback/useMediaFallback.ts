import {useState} from 'react'

import {useMediaFallbackSession} from './context'
import {type MediaFallbackSession} from './session'

function initialRoute(primary: string, session: MediaFallbackSession) {
  return {primary, session, uri: session.preferredUrl(primary)}
}

export function useMediaFallback(primary: string) {
  const session = useMediaFallbackSession()
  const [selected, setSelected] = useState(() => initialRoute(primary, session))
  let route = selected
  if (route.primary !== primary || route.session !== session) {
    route = initialRoute(primary, session)
    setSelected(route)
  }
  return {
    uri: route.uri,
    loaded() {
      if (route.uri !== primary) session.rememberRead(primary)
    },
    retry() {
      const alternate = session.alternateUrl(primary)
      if (!alternate || route.uri === alternate) return false
      setSelected({primary, session, uri: alternate})
      return true
    },
  }
}
