import {type Client} from '@atproto/lex'
import {type AtUriString, type DidString} from '@atproto/syntax'

import {logger} from '#/logger'
import {type AppView} from '#/brand/appview'
import {app} from '#/lexicons'
import {type FallbackProxyOpts, fallbackProxyOpts} from './fanout'
import {runImportMuteWrite, trackUserMuteWrites} from './ordering'

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
  client: Client,
  opts?: FallbackProxyOpts,
): Promise<MuteSnapshot<Set<AtUriString>>> {
  const uris = new Set<AtUriString>()
  let cursor: string | undefined
  let page = 0
  do {
    const res = await client.call(
      app.bsky.graph.getListMutes,
      {limit: PAGE_SIZE, cursor},
      opts,
    )
    for (const list of res.lists) {
      uris.add(list.uri)
    }
    /* An empty page is the end, even when the appview returns a cursor. */
    cursor = res.lists.length > 0 ? res.cursor : undefined
    page++
  } while (cursor && page < MAX_PAGES)
  return {entries: uris, truncated: Boolean(cursor)}
}

async function collectActorMutes(
  client: Client,
  opts?: FallbackProxyOpts,
): Promise<MuteSnapshot<Map<DidString, MuteFlavor>>> {
  const mutes = new Map<DidString, MuteFlavor>()
  let cursor: string | undefined
  let page = 0
  do {
    const res = await client.call(
      app.bsky.graph.getMutes,
      {limit: PAGE_SIZE, cursor},
      opts,
    )
    for (const profile of res.mutes) {
      mutes.set(profile.did, {
        onlyReposts: Boolean(profile.viewer?.mutedOnlyReposts),
        onlyQuoteposts: Boolean(profile.viewer?.mutedOnlyQuoteposts),
      })
    }
    /* An empty page is the end, even when the appview returns a cursor. */
    cursor = res.mutes.length > 0 ? res.cursor : undefined
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
 * changes the scope of a mute that exists on both sides. A mute the user
 * changes in this app during the run is dropped from the import, so the user
 * action wins (see `./ordering`). An unmute made on another client during
 * the snapshot window can still be re-imported; the next unmute in this app
 * heals it, since fan-out writes both appviews. Thread mutes have no
 * enumeration endpoint and cannot be reconciled.
 *
 * Both sides are read to the end of their cursor. A read that hits the page
 * bound is logged as truncated, so a partial comparison is never reported as
 * a complete one.
 */
export async function reconcileMutes(
  client: Client,
  appview: AppView,
  did: string | undefined,
): Promise<void> {
  const opts = fallbackProxyOpts(appview, did)
  if (!opts || !did) {
    return
  }
  try {
    await trackUserMuteWrites(() => importMissingMutes(client, opts))
  } catch (e) {
    logger.warn('muteSync: mute reconciliation failed', {safeMessage: e})
  }
}

/**
 * Compares both appviews and writes the mutes the routed appview lacks. Each
 * write runs through `runImportMuteWrite`, so a mute the user changed after
 * the snapshot was read is dropped instead of restored.
 */
async function importMissingMutes(
  client: Client,
  opts: FallbackProxyOpts,
): Promise<void> {
  const [sourceLists, targetLists, sourceActors, targetActors] =
    await Promise.all([
      collectListMutes(client, opts),
      collectListMutes(client),
      collectActorMutes(client, opts),
      collectActorMutes(client),
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
      list => () =>
        runImportMuteWrite(list, () =>
          client.call(app.bsky.graph.muteActorList, {list}),
        ),
    ),
    ...missingActors.map(
      ([actor, flavor]) =>
        () =>
          runImportMuteWrite(actor, () =>
            client.call(app.bsky.graph.muteActor, {
              actor,
              ...(flavor.onlyReposts ? {onlyReposts: true} : {}),
              ...(flavor.onlyQuoteposts ? {onlyQuoteposts: true} : {}),
            }),
          ),
    ),
  ]
  let failed = 0
  let superseded = 0
  for (let i = 0; i < writes.length; i += WRITE_BATCH_SIZE) {
    const batch = writes.slice(i, i + WRITE_BATCH_SIZE)
    const results = await Promise.allSettled(batch.map(write => write()))
    for (const result of results) {
      if (result.status === 'rejected') {
        failed++
      } else if (result.value === 'superseded') {
        superseded++
      }
    }
  }
  const summary = {
    lists: missingLists.length,
    actors: missingActors.length,
    failed,
    superseded,
    truncated,
  }
  if (failed > 0) {
    logger.warn('muteSync: some mute imports failed', summary)
  } else {
    logger.info('muteSync: imported mutes into the routed appview', summary)
  }
}
