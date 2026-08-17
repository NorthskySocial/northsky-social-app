import {type AtpAgent} from '@atproto/api'

import {logger} from '#/logger'
import {type AppView} from '#/brand/appview'
import {type FallbackProxyOpts, fallbackProxyOpts} from './fanout'

const PAGE_SIZE = 100
const MAX_PAGES = 10
/* Cap concurrent import writes so a large first import cannot burst. */
const WRITE_BATCH_SIZE = 10

interface MuteFlavor {
  onlyReposts: boolean
  onlyQuoteposts: boolean
}

async function collectListMutes(
  agent: AtpAgent,
  opts?: FallbackProxyOpts,
): Promise<Set<string>> {
  const uris = new Set<string>()
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await agent.app.bsky.graph.getListMutes(
      {limit: PAGE_SIZE, cursor},
      opts,
    )
    for (const list of res.data.lists) {
      uris.add(list.uri)
    }
    cursor = res.data.cursor
    if (!cursor || res.data.lists.length === 0) {
      break
    }
  }
  return uris
}

async function collectActorMutes(
  agent: AtpAgent,
  opts?: FallbackProxyOpts,
): Promise<Map<string, MuteFlavor>> {
  const mutes = new Map<string, MuteFlavor>()
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await agent.app.bsky.graph.getMutes(
      {limit: PAGE_SIZE, cursor},
      opts,
    )
    for (const profile of res.data.mutes) {
      mutes.set(profile.did, {
        onlyReposts: Boolean(profile.viewer?.mutedOnlyReposts),
        onlyQuoteposts: Boolean(profile.viewer?.mutedOnlyQuoteposts),
      })
    }
    cursor = res.data.cursor
    if (!cursor || res.data.mutes.length === 0) {
      break
    }
  }
  return mutes
}

/**
 * Imports mute state from the fallback appview into the routed appview,
 * one-way. Mutes are private appview state, so state written before the
 * appview routing existed lives only on the fallback. Runs on every session
 * start for beta users (see `fallbackProxyOpts`); the diff makes it
 * idempotent.
 *
 * Import is additive and missing-only: it never removes a mute and never
 * changes the scope of a mute that exists on both sides. An unmute made
 * elsewhere during the snapshot window can be re-imported; the next unmute
 * in this app heals it, since fan-out writes both appviews. Thread mutes
 * have no enumeration endpoint and cannot be reconciled.
 */
export async function reconcileMutes(
  agent: AtpAgent,
  appview: AppView,
): Promise<void> {
  const opts = fallbackProxyOpts(appview, agent.session?.did)
  if (!opts || !agent.session) {
    return
  }
  try {
    const [sourceLists, targetLists, sourceActors, targetActors] =
      await Promise.all([
        collectListMutes(agent, opts),
        collectListMutes(agent),
        collectActorMutes(agent, opts),
        collectActorMutes(agent),
      ])

    const missingLists = [...sourceLists].filter(uri => !targetLists.has(uri))
    const missingActors = [...sourceActors].filter(
      ([did]) => !targetActors.has(did),
    )
    if (missingLists.length === 0 && missingActors.length === 0) {
      logger.info('muteSync: mute state already in step', {
        lists: sourceLists.size,
        actors: sourceActors.size,
      })
      return
    }

    const writes = [
      ...missingLists.map(
        list => () => agent.app.bsky.graph.muteActorList({list}),
      ),
      ...missingActors.map(
        ([actor, flavor]) =>
          () =>
            agent.app.bsky.graph.muteActor({
              actor,
              ...(flavor.onlyReposts ? {onlyReposts: true} : {}),
              ...(flavor.onlyQuoteposts ? {onlyQuoteposts: true} : {}),
            }),
      ),
    ]
    let failed = 0
    for (let i = 0; i < writes.length; i += WRITE_BATCH_SIZE) {
      const batch = writes.slice(i, i + WRITE_BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(write => write()))
      failed += results.filter(r => r.status === 'rejected').length
    }
    const summary = {
      lists: missingLists.length,
      actors: missingActors.length,
      failed,
    }
    if (failed > 0) {
      logger.warn('muteSync: some mute imports failed', summary)
    } else {
      logger.info('muteSync: imported mutes into the routed appview', summary)
    }
  } catch (e) {
    logger.warn('muteSync: mute reconciliation failed', {safeMessage: e})
  }
}
