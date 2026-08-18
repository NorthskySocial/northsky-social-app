import {type Did} from '@atproto/api'

import {DEV_ENV_APPVIEW} from '#/lib/constants'
import {BLUESKY_PROXY_DID} from '#/env'

/**
 * Routes logged-in accounts to the appview that serves their community.
 * The hostname of the service URL selected at login (`agent.serviceUrl`)
 * is matched against APPVIEW_ROUTES; unmatched hosts use the Bluesky
 * fallback so unknown PDS users keep the stock experience. The logged-out
 * public agent resolves through the same map via its service host,
 * `BRAND.publicAppViewUrl`. Mirrors the host map pattern in
 * `src/brand/moderation.ts`.
 */
export interface AppView {
  url: string
  did: Did
  /**
   * Appview DID that post and actor search are pinned to. Set when this
   * appview cannot serve `app.bsky.feed.searchPostsV2` or
   * `app.bsky.actor.searchActors`.
   */
  searchProxyDid?: Did
  /**
   * Use `BRAND.typeaheadServiceUrl` for actor typeahead. Set when this appview
   * cannot serve `app.bsky.actor.searchActorsTypeahead`. That service omits
   * the `viewer` field, so callers must hydrate results before moderating
   * them - see `src/lib/typeahead/client.ts`.
   */
  useFallbackTypeahead?: boolean
  /**
   * Replay mute writes to the fallback appview and import its mute state at
   * session start. Set only on production appviews whose users also read
   * from the fallback; the dev appview must not write to production.
   * See `src/features/muteSync/`.
   */
  syncMutesWithFallback?: boolean
}

/** Appview for accounts whose PDS host matches no route. */
export const FALLBACK_APPVIEW: AppView = {
  url: 'https://api.bsky.app',
  did: 'did:web:api.bsky.app',
}

/*
 * A local dev env is signaled by an EXPO_PUBLIC_BLUESKY_PROXY_DID override
 * (see docs/build.md). In that case every account uses the local appview,
 * so the route table does not apply.
 */
const DEV_APPVIEW: AppView | undefined =
  BLUESKY_PROXY_DID !== FALLBACK_APPVIEW.did
    ? {url: DEV_ENV_APPVIEW, did: BLUESKY_PROXY_DID}
    : undefined

/*
 * Blacksky serves feeds and profiles, but every search method fails there:
 * searchPostsV2 answers 400, searchActors and searchActorsTypeahead answer
 * 502. Both search capabilities are routed away from it.
 *
 * Exported for the fixed endpoint pair in
 * `src/features/appViewTransfer/endpoints.ts`.
 */
export const BLACKSKY_APPVIEW: AppView = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
  searchProxyDid: FALLBACK_APPVIEW.did,
  useFallbackTypeahead: true,
  syncMutesWithFallback: true,
}

/**
 * Lower-case login hostnames mapped to their appview. Match is exact, no
 * wildcards.
 */
const APPVIEW_ROUTES = new Map<string, AppView>([
  ['northsky.social', BLACKSKY_APPVIEW],
  ['blacksky.community', BLACKSKY_APPVIEW],
  ['blacksky.app', BLACKSKY_APPVIEW],
  /*
   * The logged-out public agent talks to BRAND.publicAppViewUrl directly,
   * so its service host is the appview itself. Map it so the proxy header
   * and `agent.appview` stay consistent with the service it talks to.
   */
  ['api.blacksky.community', BLACKSKY_APPVIEW],
])

/**
 * Resolve the appview for an account hosted at `serviceUrl`. Unknown,
 * unparseable, or missing hosts fall back to the Bluesky appview.
 */
export function resolveAppViewForService(
  serviceUrl: string | undefined,
): AppView {
  if (DEV_APPVIEW) {
    return DEV_APPVIEW
  }
  if (serviceUrl) {
    try {
      const host = new URL(serviceUrl).hostname.toLowerCase()
      const known = APPVIEW_ROUTES.get(host)
      if (known) {
        return known
      }
    } catch {}
  }
  return FALLBACK_APPVIEW
}
