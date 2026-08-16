import {type AppBskyActorDefs, AtpAgent} from '@atproto/api'

import {type AppView} from '#/brand/appview'
import {BRAND} from '#/brand/config'

const TIMEOUT_MS = 5_000

/** Attribution value the typeahead service asks callers to send. */
const X_CLIENT = 'northsky.app'

const serviceAgents = new Map<string, AtpAgent>()

/*
 * The service exposes an `app.bsky.actor.searchActorsTypeahead` alias with the
 * same parameters as the appview method, so a plain agent on its base URL
 * needs no request or response mapping.
 */
function getServiceAgent(url: string): AtpAgent {
  let agent = serviceAgents.get(url)
  if (!agent) {
    agent = new AtpAgent({service: url})
    serviceAgents.set(url, agent)
  }
  return agent
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let actors: AppBskyActorDefs.ProfileViewBasic[]
  try {
    const res = await getServiceAgent(
      BRAND.typeaheadServiceUrl,
    ).searchActorsTypeahead(params, {
      signal: controller.signal,
      headers: {'X-Client': X_CLIENT},
    })
    actors = res.data.actors
  } finally {
    clearTimeout(timeout)
  }

  return hydrateViewerState(agent, actors)
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
  for (const actor of actors) {
    const profile = byDid.get(actor.did)
    if (!profile) {
      continue
    }
    hydrated.push({...actor, viewer: profile.viewer, labels: profile.labels})
  }
  return hydrated
}
