import {type Service} from '@atproto/lex'

import {type AppView} from './appview'

/**
 * Per-call `service` override for search requests. Appviews that cannot
 * serve search set `searchProxyDid`, which sends the call to that appview
 * instead. Appviews without the field return no options, so the request
 * keeps targeting the service the client already talks to.
 *
 * Read at call time rather than captured, so a route change applies to the
 * next query.
 */
export function searchProxyOpts(
  appview: AppView,
): {service: Service} | undefined {
  if (!appview.searchProxyDid) {
    return undefined
  }
  return {service: `${appview.searchProxyDid}#bsky_appview`}
}
