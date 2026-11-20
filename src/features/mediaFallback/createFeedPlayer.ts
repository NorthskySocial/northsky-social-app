import {createVideoPlayer} from 'expo-video'

import {type MediaFallbackSession} from './session'

export function createFeedPlayer(
  initial: string,
  session: MediaFallbackSession,
) {
  const player = createVideoPlayer(session.preferredUrl(initial))
  let source = session.preferredUrl(initial)
  let retry: {primary: string; alternate: string} | undefined
  player.addListener('sourceChange', event => {
    source =
      typeof event.source === 'string'
        ? event.source
        : typeof event.source === 'object'
          ? (event.source?.uri ?? '')
          : ''
  })
  player.addListener('statusChange', ({status}) => {
    if (status === 'readyToPlay' && retry && source === retry.alternate) {
      session.rememberRead(retry.primary)
      retry = undefined
    }
    const alternate = status === 'error' && session.alternateUrl(source)
    if (alternate) {
      retry = {primary: source, alternate}
      source = alternate
      player.replace(alternate)
    }
  })
  return player
}
