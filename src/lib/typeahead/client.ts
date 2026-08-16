import {type AppBskyActorDefs, type AtpAgent} from '@atproto/api'

import {type AppView} from '#/brand/appview'
import {BRAND} from '#/brand/config'

const TIMEOUT_MS = 5_000

/** Attribution value the typeahead service asks callers to send. */
const X_CLIENT = 'northsky.app'

/*
 * This function calls the service with plain `fetch`, as the other
 * third-party clients in `src/lib/slingshot/` do. Do not use an atproto agent
 * here. An agent puts an `atproto-accept-labelers` header on every request,
 * and the service rejects that header at the CORS preflight. The service
 * permits only `Content-Type`, `Authorization`, and `X-Client`.
 */
async function fetchFallbackTypeahead(params: {
  q: string
  limit: number
}): Promise<AppBskyActorDefs.ProfileViewBasic[]> {
  const url = new URL(
    '/xrpc/app.bsky.actor.searchActorsTypeahead',
    BRAND.typeaheadServiceUrl,
  )
  url.searchParams.set('q', params.q)
  url.searchParams.set('limit', String(params.limit))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), {
      headers: {'X-Client': X_CLIENT},
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`typeahead service responded with ${res.status}`)
    }
    const body = (await res.json()) as {actors?: unknown}
    if (!Array.isArray(body.actors)) {
      return []
    }
    /*
     * The agent checked the response against the lexicon. Plain fetch does
     * not, and the service is a third party, so each entry must carry the one
     * field the caller reads before hydration replaces the rest.
     */
    return body.actors.filter(
      (actor): actor is AppBskyActorDefs.ProfileViewBasic =>
        typeof (actor as {did?: unknown})?.did === 'string',
    )
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Actor typeahead for the given appview. Appviews that serve the method are
 * called directly. Appviews that set `useFallbackTypeahead` are served by
 * `BRAND.typeaheadServiceUrl` instead, and those results are hydrated before
 * they are returned.
 */
export async function searchActorsTypeaheadVia(
  appview: AppView,
  agent: AtpAgent,
  params: {q: string; limit: number},
): Promise<AppBskyActorDefs.ProfileViewBasic[]> {
  if (!appview.useFallbackTypeahead) {
    const res = await agent.searchActorsTypeahead(params)
    return res.data.actors
  }

  return hydrateViewerState(agent, await fetchFallbackTypeahead(params))
}

/** `app.bsky.actor.getProfiles` accepts at most 25 actors per call. */
const HYDRATION_LIMIT = 25

/**
 * Fills in the `viewer` and `labels` fields that the typeahead service omits,
 * reading them from the account's own appview. `moderateProfile` needs
 * `viewer` to see mutes and blocks, and it needs `labels` to apply labeler
 * rules. Without this step, muted and blocked accounts appear in typeahead
 * results, including the direct message recipient pickers.
 *
 * An account the appview does not return is dropped. The appview omits
 * deactivated, suspended, and takendown accounts, and an entry that keeps
 * neither `viewer` nor `labels` passes moderation unconditionally. Dropping it
 * fails closed. The service's ranking is preserved for the rest.
 *
 * The service controls how many accounts it returns, so the list is capped at
 * what `getProfiles` accepts.
 */
async function hydrateViewerState(
  agent: AtpAgent,
  actors: AppBskyActorDefs.ProfileViewBasic[],
): Promise<AppBskyActorDefs.ProfileViewBasic[]> {
  if (actors.length === 0) {
    return actors
  }

  const dids = [...new Set(actors.map(a => a.did))].slice(0, HYDRATION_LIMIT)
  const res = await agent.getProfiles({actors: dids})
  const byDid = new Map(res.data.profiles.map(p => [p.did, p]))

  const hydrated: AppBskyActorDefs.ProfileViewBasic[] = []
  const emitted = new Set<string>()
  for (const actor of actors) {
    const profile = byDid.get(actor.did)
    if (!profile || emitted.has(actor.did)) {
      continue
    }
    emitted.add(actor.did)
    hydrated.push({...actor, viewer: profile.viewer, labels: profile.labels})
  }
  return hydrated
}
