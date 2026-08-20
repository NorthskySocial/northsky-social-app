/**
 * One-directional import of private appview state between the two fixed
 * endpoints. Ported from eurosky-social-app (MIT) commit 3407eb8, rewritten
 * from `@atproto/lex` onto `AtpAgent`.
 *
 * This is an import, not a sync. No collection deletes an item at the
 * destination. Most collections leave an item that exists on both sides
 * untouched. `activitySubscriptions` merges instead: an item on both sides
 * keeps every notification type that either side subscribes to.
 * `notificationPreferences` replaces the destination preference set.
 */
import {
  type AppBskyNotificationDefs,
  type AppBskyNotificationPutPreferencesV2,
  type AtpAgent,
  XRPCError,
} from '@atproto/api'

import {
  APP_VIEW_TRANSFER_COLLECTIONS,
  type AppViewTransferCheckpoint,
  type AppViewTransferCollectionId,
  type AppViewTransferCollectionProgress,
  type TransferEndpoint,
} from './types'

const PAGE_SIZE = 100
// Bounds a run against an appview whose cursor never ends.
const MAX_PAGES = 500
// `app.bsky.actor.getProfiles` accepts 25 actors per call.
const PROFILE_BATCH_SIZE = 25

type TransferItem = {
  key: string
  value: unknown
}

type TransferPage = {
  items: TransferItem[]
  cursor?: string
  // Items the appview listed but would not give a value for.
  skipped?: number
}

type RequestTarget = {
  agent: AtpAgent
  // The proxy header pins the appview. Each call also takes the abort signal.
  opts: {headers: {'atproto-proxy': string}; signal: AbortSignal}
}

type CollectionAdapter = {
  id: AppViewTransferCollectionId
  readPage: (target: RequestTarget, cursor?: string) => Promise<TransferPage>
  write: (target: RequestTarget, item: TransferItem) => Promise<void>
  valuesEqual?: (left: unknown, right: unknown) => boolean
  mergeValues?: (source: unknown, destination: unknown) => unknown
  /**
   * This and the worker pool for `writeMissingItems` is no longer used
   * in favor of sortForWrite. Should be cleaned up.
   */
  writeConcurrency?: number
  sortForWrite?: (items: TransferItem[]) => TransferItem[]
  /**
   * Reports which of `keys` the destination already holds in a form that
   * `readPage` cannot list. The engine treats each returned key as present,
   * so the write pass leaves it alone.
   */
  findHiddenDestinationKeys?: (
    target: RequestTarget,
    keys: string[],
  ) => Promise<string[]>
}

type MuteFlavor = {
  onlyReposts: boolean
  onlyQuoteposts: boolean
}

type ActivitySubscription = AppBskyNotificationDefs.ActivitySubscription

const collectionAdapters: Record<
  AppViewTransferCollectionId,
  CollectionAdapter
> = {
  mutedAccounts: {
    id: 'mutedAccounts',
    async readPage(target, cursor) {
      const res = await callWithRetry(
        () =>
          target.agent.app.bsky.graph.getMutes(
            {cursor, limit: PAGE_SIZE},
            target.opts,
          ),
        target.opts.signal,
      )
      /*
       * Both appviews list only accounts that are muted in full, so the scope
       * fields read false today. Read them anyway, so an appview that does
       * list a scoped mute keeps that scope at the destination.
       */
      return {
        cursor: res.data.cursor,
        items: res.data.mutes.map(profile => ({
          key: profile.did,
          value: {
            onlyReposts: Boolean(profile.viewer?.mutedOnlyReposts),
            onlyQuoteposts: Boolean(profile.viewer?.mutedOnlyQuoteposts),
          } satisfies MuteFlavor,
        })),
      }
    },
    async write(target, item) {
      const flavor = item.value as MuteFlavor
      await callWithRetry(
        () =>
          target.agent.app.bsky.graph.muteActor(
            {
              actor: item.key,
              ...(flavor.onlyReposts ? {onlyReposts: true} : {}),
              ...(flavor.onlyQuoteposts ? {onlyQuoteposts: true} : {}),
            },
            target.opts,
          ),
        target.opts.signal,
      )
    },
    // Missing-only: a mute both sides hold keeps the destination scope.
    valuesEqual: () => true,
    /*
     * `getMutes` omits a mute that covers only reposts or only quote posts, so
     * such a mute looks absent at the destination. `muteActor` replaces the
     * stored scope, so a write would widen it to the whole account. Read the
     * viewer state to find those accounts, so the write pass skips them.
     */
    async findHiddenDestinationKeys(target, keys) {
      const hidden: string[] = []
      for (let start = 0; start < keys.length; start += PROFILE_BATCH_SIZE) {
        const actors = keys.slice(start, start + PROFILE_BATCH_SIZE)
        const res = await callWithRetry(
          () => target.agent.app.bsky.actor.getProfiles({actors}, target.opts),
          target.opts.signal,
        )
        for (const profile of res.data.profiles) {
          const viewer = profile.viewer
          if (viewer?.mutedOnlyReposts || viewer?.mutedOnlyQuoteposts) {
            hidden.push(profile.did)
          }
        }
      }
      return hidden
    },
  },
  mutedLists: {
    id: 'mutedLists',
    async readPage(target, cursor) {
      const res = await callWithRetry(
        () =>
          target.agent.app.bsky.graph.getListMutes(
            {cursor, limit: PAGE_SIZE},
            target.opts,
          ),
        target.opts.signal,
      )
      return {
        cursor: res.data.cursor,
        items: res.data.lists.map(list => ({key: list.uri, value: list.uri})),
      }
    },
    async write(target, item) {
      await callWithRetry(
        () =>
          target.agent.app.bsky.graph.muteActorList(
            {list: item.value as string},
            target.opts,
          ),
        target.opts.signal,
      )
    },
  },
  bookmarks: {
    id: 'bookmarks',
    async readPage(target, cursor) {
      const res = await callWithRetry(
        () =>
          target.agent.app.bsky.bookmark.getBookmarks(
            {cursor, limit: PAGE_SIZE},
            target.opts,
          ),
        target.opts.signal,
      )
      return {
        cursor: res.data.cursor,
        items: res.data.bookmarks.map(bookmark => ({
          key: bookmark.subject.uri,
          value: bookmark.subject,
        })),
      }
    },
    async write(target, item) {
      const subject = item.value as {uri: string; cid: string}
      await callWithRetry(
        () =>
          target.agent.app.bsky.bookmark.createBookmark(
            {uri: subject.uri, cid: subject.cid},
            {...target.opts, encoding: 'application/json'},
          ),
        target.opts.signal,
      )
    },
    // A bookmark is identified by its URI. An older CID is the same bookmark.
    valuesEqual: () => true,
    /*
     * `createBookmark` sends no timestamp. The destination stamps each
     * bookmark as it accepts the write, and lists the newest first. The source
     * also lists the newest first, so send the list in reverse to give the
     * oldest bookmark the oldest stamp. A resume writes the items the earlier
     * pass missed, which are the newer ones, so the order still holds.
     */
    sortForWrite: items => [...items].reverse(),
  },
  activitySubscriptions: {
    id: 'activitySubscriptions',
    async readPage(target, cursor) {
      const res = await callWithRetry(
        () =>
          target.agent.app.bsky.notification.listActivitySubscriptions(
            {cursor, limit: PAGE_SIZE},
            target.opts,
          ),
        target.opts.signal,
      )
      const items: TransferItem[] = []
      let skipped = 0
      for (const profile of res.data.subscriptions) {
        const subscription = profile.viewer?.activitySubscription
        /*
         * The appview withholds the value when the subject no longer accepts
         * activity subscriptions from this account. The subscription is real,
         * but its settings cannot be read, so it cannot be copied.
         */
        if (!subscription) {
          skipped++
          continue
        }
        items.push({
          key: profile.did,
          value: {
            post: subscription.post,
            reply: subscription.reply,
          } satisfies ActivitySubscription,
        })
      }
      return {cursor: res.data.cursor, items, skipped}
    },
    async write(target, item) {
      await callWithRetry(
        () =>
          target.agent.app.bsky.notification.putActivitySubscription(
            {
              subject: item.key,
              activitySubscription: item.value as ActivitySubscription,
            },
            {...target.opts, encoding: 'application/json'},
          ),
        target.opts.signal,
      )
    },
    valuesEqual: deepEqual,
    mergeValues(source, destination) {
      const sourceSubscription = source as ActivitySubscription
      const destinationSubscription = destination as ActivitySubscription
      return {
        post: sourceSubscription.post || destinationSubscription.post,
        reply: sourceSubscription.reply || destinationSubscription.reply,
      } satisfies ActivitySubscription
    },
  },
  notificationPreferences: {
    id: 'notificationPreferences',
    async readPage(target) {
      const res = await callWithRetry(
        () =>
          target.agent.app.bsky.notification.getPreferences({}, target.opts),
        target.opts.signal,
      )
      // Chat preferences belong to the chat service, not the appview.
      const {chat: _chat, $type: _type, ...preferences} = res.data.preferences
      return {
        items: [{key: 'preferences', value: preferences}],
      }
    },
    async write(target, item) {
      await callWithRetry(
        () =>
          target.agent.app.bsky.notification.putPreferencesV2(
            item.value as AppBskyNotificationPutPreferencesV2.InputSchema,
            {...target.opts, encoding: 'application/json'},
          ),
        target.opts.signal,
      )
    },
    valuesEqual: deepEqual,
  },
}

export function createTransferCheckpoint({
  accountDid,
  source,
  destination,
  selectedCollections,
}: {
  accountDid: string
  source: TransferEndpoint
  destination: TransferEndpoint
  selectedCollections: AppViewTransferCollectionId[]
}): AppViewTransferCheckpoint {
  const now = new Date().toISOString()
  /*
   * The caller collects the selection in the order the user toggled it. Sort
   * it into transfer order, so the screen names the collection the run works
   * on.
   */
  const ordered = APP_VIEW_TRANSFER_COLLECTIONS.filter(id =>
    selectedCollections.includes(id),
  )
  return {
    version: 1,
    accountDid,
    source,
    destination,
    selectedCollections: ordered,
    status: 'paused',
    startedAt: now,
    updatedAt: now,
    collections: Object.fromEntries(
      ordered.map(id => [id, initialCollectionProgress()]),
    ),
  }
}

export async function runAppViewTransfer({
  agent,
  initialCheckpoint,
  signal,
  onProgress,
  onCollectionError,
}: {
  agent: AtpAgent
  initialCheckpoint: AppViewTransferCheckpoint
  signal: AbortSignal
  onProgress: (checkpoint: AppViewTransferCheckpoint) => void
  onCollectionError?: (id: AppViewTransferCollectionId, error: unknown) => void
}): Promise<AppViewTransferCheckpoint> {
  let checkpoint = initialCheckpoint

  const emit = (
    patch: Partial<AppViewTransferCheckpoint>,
  ): AppViewTransferCheckpoint => {
    checkpoint = {
      ...checkpoint,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    onProgress(checkpoint)
    return checkpoint
  }

  const updateCollection = (
    id: AppViewTransferCollectionId,
    patch: Partial<AppViewTransferCollectionProgress>,
  ) => {
    const previous = checkpoint.collections[id] ?? initialCollectionProgress()
    emit({
      collections: {
        ...checkpoint.collections,
        [id]: {...previous, ...patch},
      },
    })
  }

  emit({status: 'running'})

  for (const id of APP_VIEW_TRANSFER_COLLECTIONS) {
    if (!checkpoint.selectedCollections.includes(id)) continue
    const existing = checkpoint.collections[id] ?? initialCollectionProgress()
    if (existing.status === 'complete' || existing.status === 'unsupported') {
      continue
    }

    const adapter = collectionAdapters[id]
    let endpoint: 'source' | 'destination' = 'destination'

    try {
      throwIfAborted(signal)
      endpoint = 'source'
      updateCollection(id, {
        status: 'countingSource',
        sourceScanned: false,
        processedCount: 0,
        failedCount: undefined,
        destinationScanned: false,
        destinationAfter: undefined,
        unsupportedAt: undefined,
        failureAt: undefined,
        failureStatus: undefined,
        failureName: undefined,
      })
      const sourceRead = await readAllItems({
        adapter,
        target: makeTarget(agent, checkpoint.source, signal),
      })
      const sourceItems = sourceRead.items
      updateCollection(id, {
        sourceCount: sourceItems.size + sourceRead.skipped,
        sourceScanned: true,
      })

      endpoint = 'destination'
      updateCollection(id, {status: 'countingDestination'})
      const destinationItems = (
        await readAllItems({
          adapter,
          target: makeTarget(agent, checkpoint.destination, signal),
        })
      ).items
      const progressAfterCount =
        checkpoint.collections[id] ?? initialCollectionProgress()
      const destinationBefore =
        progressAfterCount.destinationBefore ?? destinationItems.size
      updateCollection(id, {
        destinationBefore,
        destinationScanned: true,
        destinationAfter: destinationItems.size,
        status: 'transferring',
      })

      /*
       * Runs after the counts, so the summary keeps reporting what the
       * destination lists. It only holds the write pass back from an item the
       * destination already holds in a form the list leaves out.
       */
      const hiddenKeys = new Set<string>()
      if (adapter.findHiddenDestinationKeys) {
        const candidates = [...sourceItems.keys()].filter(
          key => !destinationItems.has(key),
        )
        if (candidates.length > 0) {
          const hidden = await adapter.findHiddenDestinationKeys(
            makeTarget(agent, checkpoint.destination, signal),
            candidates,
          )
          for (const key of hidden) hiddenKeys.add(key)
        }
      }

      const {failedCount, firstError} = await writeMissingItems({
        adapter,
        items: [...sourceItems.values()],
        target: makeTarget(agent, checkpoint.destination, signal),
        destinationItems,
        hiddenKeys,
        onPrepared(pendingCount) {
          updateCollection(id, {
            processedCount: sourceItems.size - pendingCount,
          })
        },
        onWritten() {
          const progress =
            checkpoint.collections[id] ?? initialCollectionProgress()
          updateCollection(id, {
            processedCount: (progress.processedCount ?? 0) + 1,
            transferredCount: progress.transferredCount + 1,
            destinationAfter: destinationItems.size,
          })
        },
      })

      /*
       * A skipped item is one the source listed but would not describe, so it
       * could not be copied. Report it with the write failures, because the
       * user needs the same answer: the item did not arrive.
       */
      const missedCount = failedCount + sourceRead.skipped
      if (missedCount > 0) {
        if (firstError) onCollectionError?.(id, firstError)
        updateCollection(id, {
          status: 'failed',
          failedCount: missedCount,
          failureAt: failedCount > 0 ? 'destination' : 'source',
          destinationAfter: destinationItems.size,
          ...(firstError ? safeFailureDetails(firstError) : {}),
        })
        continue
      }

      /*
       * A successful write updates the in-memory destination set, so a second
       * pagination pass would only slow a large collection down.
       */
      updateCollection(id, {
        status: 'complete',
        destinationAfter: destinationItems.size,
      })
    } catch (error) {
      if (signal.aborted) throw error
      if (isUnsupportedCollectionError(error)) {
        updateCollection(id, {
          status: 'unsupported',
          unsupportedAt: endpoint,
          failureAt: undefined,
          failureStatus: undefined,
          failureName: undefined,
        })
      } else {
        onCollectionError?.(id, error)
        updateCollection(id, {
          status: 'failed',
          failureAt: endpoint,
          ...safeFailureDetails(error),
        })
      }
    }
  }

  return emit({status: 'complete'})
}

function initialCollectionProgress(): AppViewTransferCollectionProgress {
  return {
    status: 'pending',
    sourceCount: 0,
    processedCount: 0,
    transferredCount: 0,
  }
}

function makeTarget(
  agent: AtpAgent,
  endpoint: TransferEndpoint,
  signal: AbortSignal,
): RequestTarget {
  return {
    agent,
    opts: {
      headers: {'atproto-proxy': `${endpoint.did}#bsky_appview`},
      signal,
    },
  }
}

/**
 * Writes the source items the destination lacks. A failed item does not halt
 * the pass, unlike the eurosky original: the pass attempts every item, counts
 * the failures, and keeps the first error. One deactivated account must not
 * block the rest of a mute import. An abort still stops the pass at once.
 */
async function writeMissingItems({
  adapter,
  items,
  target,
  destinationItems,
  hiddenKeys,
  onPrepared,
  onWritten,
}: {
  adapter: CollectionAdapter
  items: TransferItem[]
  target: RequestTarget
  destinationItems: Map<string, TransferItem>
  hiddenKeys: Set<string>
  onPrepared: (pendingCount: number) => void
  onWritten: () => void
}): Promise<{failedCount: number; firstError?: unknown}> {
  const valuesEqual = adapter.valuesEqual ?? deepEqual
  const missing = items.flatMap(item => {
    if (hiddenKeys.has(item.key)) return []
    const destinationItem = destinationItems.get(item.key)
    const desiredItem =
      destinationItem && adapter.mergeValues
        ? {
            ...item,
            value: adapter.mergeValues(item.value, destinationItem.value),
          }
        : item
    return !destinationItem ||
      !valuesEqual(destinationItem.value, desiredItem.value)
      ? [desiredItem]
      : []
  })
  const pending = adapter.sortForWrite?.(missing) ?? missing
  onPrepared(pending.length)
  let nextIndex = 0
  let firstError: unknown
  let failedCount = 0

  const worker = async () => {
    while (true) {
      const index = nextIndex++
      const item = pending[index]
      if (!item) return
      throwIfAborted(target.opts.signal)
      try {
        await adapter.write(target, item)
        destinationItems.set(item.key, item)
        onWritten()
      } catch (error) {
        if (target.opts.signal.aborted) throw error
        firstError ??= error
        failedCount++
      }
    }
  }

  const concurrency = Math.min(
    adapter.writeConcurrency ?? 1,
    Math.max(1, pending.length),
  )
  await Promise.all(Array.from({length: concurrency}, worker))
  return {failedCount, firstError}
}

async function readAllItems({
  adapter,
  target,
}: {
  adapter: CollectionAdapter
  target: RequestTarget
}): Promise<{items: Map<string, TransferItem>; skipped: number}> {
  const items = new Map<string, TransferItem>()
  const seenCursors = new Set<string>()
  let skipped = 0
  let cursor: string | undefined

  while (true) {
    throwIfAborted(target.opts.signal)
    const page = await adapter.readPage(target, cursor)
    for (const item of page.items) {
      items.set(item.key, item)
    }
    skipped += page.skipped ?? 0
    if (!page.cursor) return {items, skipped}
    if (seenCursors.has(page.cursor)) {
      throw new Error('AppView returned a repeated pagination cursor')
    }
    /*
     * An empty page with a new cursor is not the end. An appview can drop a
     * whole page while it hydrates the results. Follow the cursor, but stop
     * at a page bound so a broken cursor cannot page without end. Both stops
     * fail the collection, because a short read must not report success.
     */
    if (seenCursors.size >= MAX_PAGES) {
      throw new Error('AppView exceeded the pagination page limit')
    }
    seenCursors.add(page.cursor)
    cursor = page.cursor
  }
}

async function callWithRetry<T>(
  call: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal)
    try {
      return await call()
    } catch (error) {
      if (
        signal.aborted ||
        attempt >= maxRetries(error) ||
        !isRetryableError(error)
      ) {
        throw error
      }
      await sleep(retryDelay(error, attempt), signal)
    }
  }
}

/**
 * `XRPCError.status` is a ResponseType enum. Widen it to a number so status
 * comparisons do not depend on `@atproto/xrpc`, which is not a direct
 * dependency.
 */
function statusOf(error: XRPCError): number {
  return error.status
}

// `ResponseType.Unknown`, which a network failure without a response reports.
const STATUS_NO_RESPONSE = 1

function maxRetries(error: unknown): number {
  return error instanceof XRPCError && statusOf(error) === 429 ? 4 : 2
}

/**
 * `XRPCError` maps an HTTP status to the nearest `ResponseType`, so only the
 * statuses in that enum can appear here. A 408 or 425 arrives as 400 and is
 * not retried, because 400 also covers requests this client must not repeat.
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof XRPCError)) return false
  return [STATUS_NO_RESPONSE, 429, 500, 502, 503, 504].includes(statusOf(error))
}

function retryDelay(error: unknown, attempt: number): number {
  if (error instanceof XRPCError) {
    const retryAfter = error.headers?.['retry-after']
    if (retryAfter) {
      const seconds = Number(retryAfter)
      if (Number.isFinite(seconds)) {
        return Math.min(60_000, Math.max(0, seconds * 1000))
      }
      const dateDelay = new Date(retryAfter).getTime() - Date.now()
      if (Number.isFinite(dateDelay)) {
        return Math.min(60_000, Math.max(0, dateDelay))
      }
    }
  }
  return 500 * 2 ** attempt + Math.floor(Math.random() * 250)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      reject(new Error('Transfer paused'))
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, {once: true})
    if (signal.aborted) onAbort()
  })
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Transfer paused')
}

function isUnsupportedCollectionError(error: unknown): boolean {
  return (
    error instanceof XRPCError &&
    (statusOf(error) === 404 ||
      statusOf(error) === 501 ||
      ['XRPCNotSupported', 'MethodNotFound', 'NotSupported'].includes(
        error.error,
      ))
  )
}

function safeFailureDetails(error: unknown): {
  failureStatus?: number
  failureName: string
} {
  if (error instanceof XRPCError) {
    if (statusOf(error) === STATUS_NO_RESPONSE) {
      return {failureName: 'NetworkError'}
    }
    return {failureStatus: statusOf(error), failureName: error.error}
  }
  return {failureName: 'UnexpectedError'}
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (
    !left ||
    !right ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    return (
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    )
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        deepEqual(leftRecord[key], rightRecord[key]),
    )
  )
}
