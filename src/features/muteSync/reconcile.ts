import {type AtpAgent} from '@atproto/api'

import {logger} from '#/logger'
import {type AppView} from '#/brand/appview'
import {type FallbackProxyOpts, fallbackProxyOpts} from './fanout'

const PAGE_SIZE = 100
/*
 * A safety bound only. An appview that keeps returning a cursor must not
 * spin forever. A read that hits the bound is reported as truncated and is
 * never counted as a complete comparison.
 */
const MAX_PAGES = 1000
/* Cap concurrent import writes so a large first import cannot burst. */
const WRITE_BATCH_SIZE = 10

interface MuteFlavor {
  onlyReposts: boolean
  onlyQuoteposts: boolean
}

/** One side of the comparison, plus whether its read reached the end. */
interface MuteSnapshot<T> {
  entries: T
  truncated: boolean
}

async function collectListMutes(
  agent: AtpAgent,
  opts?: FallbackProxyOpts,
): Promise<MuteSnapshot<Set<string>>> {
  const uris = new Set<string>()
  let cursor: string | undefined
  let page = 0
  do {
    const res = await agent.app.bsky.graph.getListMutes(
      {limit: PAGE_SIZE, cursor},
      opts,
    )
    for (const list of res.data.lists) {
      uris.add(list.uri)
    }
    /* An empty page is the end, even when the appview returns a cursor. */
    cursor = res.data.lists.length > 0 ? res.data.cursor : undefined
    page++
  } while (cursor && page < MAX_PAGES)
  return {entries: uris, truncated: Boolean(cursor)}
}

async function collectActorMutes(
  agent: AtpAgent,
  opts?: FallbackProxyOpts,
): Promise<MuteSnapshot<Map<string, MuteFlavor>>> {
  const mutes = new Map<string, MuteFlavor>()
  let cursor: string | undefined
  let page = 0
  do {
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
    /* An empty page is the end, even when the appview returns a cursor. */
    cursor = res.data.mutes.length > 0 ? res.data.cursor : undefined
    page++
  } while (cursor && page < MAX_PAGES)
  return {entries: mutes, truncated: Boolean(cursor)}
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
 *
 * Both sides are read to the end of their cursor. A read that hits the page
 * bound is logged as truncated, so a partial comparison is never reported as
 * a complete one.
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

    const truncated =
      sourceLists.truncated ||
      targetLists.truncated ||
      sourceActors.truncated ||
      targetActors.truncated
    const missingLists = [...sourceLists.entries].filter(
      uri => !targetLists.entries.has(uri),
    )
    const missingActors = [...sourceActors.entries].filter(
      ([did]) => !targetActors.entries.has(did),
    )
    if (missingLists.length === 0 && missingActors.length === 0) {
      const read = {
        lists: sourceLists.entries.size,
        actors: sourceActors.entries.size,
      }
      if (truncated) {
        logger.warn('muteSync: mute comparison stopped at the page bound', read)
      } else {
        logger.info('muteSync: mute state already in step', read)
      }
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
      truncated,
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
