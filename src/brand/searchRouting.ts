import {type AppView} from './appview'

/**
 * Per-call `atproto-proxy` override for search requests. Appviews that cannot
 * serve search set `searchProxyDid`, which sends the call to that appview
 * instead. Appviews without the field return empty options, so the request
 * follows the header the agent already carries.
 *
 * Read at call time rather than captured, so a route change applies to the
 * next query.
 */
export function searchProxyOpts(appview: AppView) {
  if (!appview.searchProxyDid) {
    return {}
  }
  return {headers: {'atproto-proxy': `${appview.searchProxyDid}#bsky_appview`}}
}
