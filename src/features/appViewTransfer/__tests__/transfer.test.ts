import {type AtpAgent, XRPCError} from '@atproto/api'
import {describe, expect, it} from '@jest/globals'

import {createTransferCheckpoint, runAppViewTransfer} from '../transfer'
import {type TransferEndpoint} from '../types'

const SOURCE: TransferEndpoint = {
  id: 'bluesky',
  did: 'did:web:source.example',
  url: 'https://source.example',
}
const DESTINATION: TransferEndpoint = {
  id: 'blacksky',
  did: 'did:web:destination.example',
  url: 'https://destination.example',
}
const SOURCE_SERVICE = `${SOURCE.did}#bsky_appview`
const DESTINATION_SERVICE = `${DESTINATION.did}#bsky_appview`

type Recorded = {nsid: string; input: unknown; service: string | undefined}

/**
 * Builds a minimal AtpAgent double. Every namespace method routes through
 * `handler` with its nsid and the per-call `atproto-proxy` header, so tests
 * assert both behavior and request targeting.
 */
function makeAgent(
  handler: (
    nsid: string,
    input: Record<string, unknown>,
    service: string | undefined,
  ) => unknown,
) {
  const calls: Recorded[] = []
  const method =
    (nsid: string) =>
    async (
      input: Record<string, unknown>,
      opts?: {headers?: Record<string, string>},
    ) => {
      const service = opts?.headers?.['atproto-proxy']
      calls.push({nsid, input, service})
      /* Yield once so concurrent workers interleave like real requests. */
      await Promise.resolve()
      return {data: await handler(nsid, input, service)}
    }
  const agent = {
    app: {
      bsky: {
        graph: {
          getMutes: method('app.bsky.graph.getMutes'),
          muteActor: method('app.bsky.graph.muteActor'),
          getListMutes: method('app.bsky.graph.getListMutes'),
          muteActorList: method('app.bsky.graph.muteActorList'),
        },
        bookmark: {
          getBookmarks: method('app.bsky.bookmark.getBookmarks'),
          createBookmark: method('app.bsky.bookmark.createBookmark'),
        },
        notification: {
          listActivitySubscriptions: method(
            'app.bsky.notification.listActivitySubscriptions',
          ),
          putActivitySubscription: method(
            'app.bsky.notification.putActivitySubscription',
          ),
          getPreferences: method('app.bsky.notification.getPreferences'),
          putPreferencesV2: method('app.bsky.notification.putPreferencesV2'),
        },
      },
    },
  } as unknown as AtpAgent
  return {agent, calls}
}

function checkpointFor(
  selectedCollections: Parameters<
    typeof createTransferCheckpoint
  >[0]['selectedCollections'],
) {
  return createTransferCheckpoint({
    accountDid: 'did:plc:account',
    source: SOURCE,
    destination: DESTINATION,
    selectedCollections,
  })
}

describe('runAppViewTransfer', () => {
  it('transfers every collection with per-request proxy targets', async () => {
    const source = {
      mutes: new Map([
        ['did:plc:sailor-moon', {}],
        ['did:plc:tuxedo-mask', {}],
      ]),
      lists: new Set(['at://did:plc:sailor-moon/app.bsky.graph.list/one']),
      bookmarks: new Map([
        ['at://did:plc:sailor-moon/app.bsky.feed.post/one', 'bafysourceone'],
      ]),
      subscriptions: new Map([
        ['did:plc:sailor-mercury', {post: true, reply: false}],
      ]),
      preferences: {like: {include: 'all', list: true, push: true}},
    }
    const destination = {
      mutes: new Map([['did:plc:tuxedo-mask', {}]]),
      lists: new Set<string>(),
      bookmarks: new Map([
        ['at://did:plc:sailor-mars/app.bsky.feed.post/two', 'bafydesttwo'],
      ]),
      subscriptions: new Map([
        ['did:plc:sailor-mercury', {post: false, reply: true}],
      ]),
      preferences: {like: {include: 'follows', list: false, push: false}},
    }

    const {agent, calls} = makeAgent((nsid, input, service) => {
      const state = service === SOURCE_SERVICE ? source : destination
      switch (nsid) {
        case 'app.bsky.graph.getMutes':
          return {mutes: [...state.mutes.keys()].map(did => ({did}))}
        case 'app.bsky.graph.muteActor':
          destination.mutes.set(input.actor as string, {})
          return undefined
        case 'app.bsky.graph.getListMutes':
          return {lists: [...state.lists].map(uri => ({uri}))}
        case 'app.bsky.graph.muteActorList':
          destination.lists.add(input.list as string)
          return undefined
        case 'app.bsky.bookmark.getBookmarks':
          return {
            bookmarks: [...state.bookmarks].map(([uri, cid]) => ({
              subject: {uri, cid},
            })),
          }
        case 'app.bsky.bookmark.createBookmark':
          destination.bookmarks.set(input.uri as string, input.cid as string)
          return undefined
        case 'app.bsky.notification.listActivitySubscriptions':
          return {
            subscriptions: [...state.subscriptions].map(
              ([did, activitySubscription]) => ({
                did,
                viewer: {activitySubscription},
              }),
            ),
          }
        case 'app.bsky.notification.putActivitySubscription':
          destination.subscriptions.set(
            input.subject as string,
            input.activitySubscription as {post: boolean; reply: boolean},
          )
          return {
            subject: input.subject,
            activitySubscription: input.activitySubscription,
          }
        case 'app.bsky.notification.getPreferences':
          return {preferences: state.preferences}
        case 'app.bsky.notification.putPreferencesV2':
          destination.preferences = input as typeof destination.preferences
          return {preferences: input}
        default:
          throw new Error(`Unexpected method: ${nsid}`)
      }
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor([
        'mutedAccounts',
        'mutedLists',
        'bookmarks',
        'activitySubscriptions',
        'notificationPreferences',
      ]),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.status).toBe('complete')
    expect(result.collections.mutedAccounts).toMatchObject({
      status: 'complete',
      sourceCount: 2,
      transferredCount: 1,
      destinationBefore: 1,
      destinationAfter: 2,
    })
    expect(result.collections.mutedLists).toMatchObject({
      status: 'complete',
      sourceCount: 1,
      transferredCount: 1,
    })
    expect(result.collections.bookmarks).toMatchObject({
      status: 'complete',
      sourceCount: 1,
      transferredCount: 1,
      destinationBefore: 1,
      destinationAfter: 2,
    })
    expect(result.collections.activitySubscriptions).toMatchObject({
      status: 'complete',
      sourceCount: 1,
      transferredCount: 1,
    })
    expect(result.collections.notificationPreferences).toMatchObject({
      status: 'complete',
      sourceCount: 1,
      transferredCount: 1,
    })
    expect([...destination.mutes.keys()].sort()).toEqual([
      'did:plc:sailor-moon',
      'did:plc:tuxedo-mask',
    ])
    expect(destination.preferences).toEqual(source.preferences)
    /* Merge keeps the destination-only reply subscription. */
    expect(destination.subscriptions.get('did:plc:sailor-mercury')).toEqual({
      post: true,
      reply: true,
    })
    for (const call of calls) {
      expect([SOURCE_SERVICE, DESTINATION_SERVICE]).toContain(call.service)
    }
  })

  it('imports missing mutes with their flavor and never rewrites existing ones', async () => {
    const writes: Record<string, unknown>[] = []
    const {agent} = makeAgent((nsid, input, service) => {
      switch (nsid) {
        case 'app.bsky.graph.getMutes':
          return service === SOURCE_SERVICE
            ? {
                mutes: [
                  /* Missing at destination, repost-scoped. */
                  {
                    did: 'did:plc:ryoko',
                    viewer: {mutedOnlyReposts: true},
                  },
                  /* Present at destination with a different scope. */
                  {did: 'did:plc:ayeka', viewer: {}},
                ],
              }
            : {
                mutes: [
                  {
                    did: 'did:plc:ayeka',
                    viewer: {mutedOnlyQuoteposts: true},
                  },
                ],
              }
        case 'app.bsky.graph.muteActor':
          writes.push(input)
          return undefined
        default:
          throw new Error(`Unexpected method: ${nsid}`)
      }
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['mutedAccounts']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.collections.mutedAccounts).toMatchObject({
      status: 'complete',
      transferredCount: 1,
    })
    expect(writes).toEqual([{actor: 'did:plc:ryoko', onlyReposts: true}])
  })

  it('resumes without duplicating writes and skips finished collections', async () => {
    const sourceMutes = ['did:plc:ryoko', 'did:plc:sasami']
    const destinationMutes = new Set(['did:plc:ryoko'])
    const {agent, calls} = makeAgent((nsid, input, service) => {
      if (nsid === 'app.bsky.graph.getMutes') {
        const mutes =
          service === SOURCE_SERVICE ? sourceMutes : [...destinationMutes]
        return {mutes: mutes.map(did => ({did}))}
      }
      if (nsid === 'app.bsky.graph.muteActor') {
        destinationMutes.add(input.actor as string)
        return undefined
      }
      throw new Error(`Unexpected method: ${nsid}`)
    })
    const initial = checkpointFor(['mutedAccounts', 'mutedLists'])
    initial.collections.mutedAccounts = {
      status: 'failed',
      sourceCount: 1,
      transferredCount: 1,
      destinationBefore: 0,
    }
    initial.collections.mutedLists = {
      status: 'complete',
      sourceCount: 3,
      transferredCount: 3,
    }

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: initial,
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.collections.mutedAccounts).toMatchObject({
      status: 'complete',
      sourceCount: 2,
      transferredCount: 2,
      destinationBefore: 0,
      destinationAfter: 2,
    })
    /* The complete collection is not re-read or re-written. */
    expect(result.collections.mutedLists).toMatchObject({
      status: 'complete',
      transferredCount: 3,
    })
    expect(
      calls.filter(call => call.nsid === 'app.bsky.graph.muteActor'),
    ).toHaveLength(1)
    expect(
      calls.filter(call => call.nsid === 'app.bsky.graph.getListMutes'),
    ).toHaveLength(0)
  })

  it('attempts every item when single writes fail', async () => {
    const written: string[] = []
    const {agent} = makeAgent((nsid, input, service) => {
      if (nsid === 'app.bsky.bookmark.getBookmarks') {
        return service === SOURCE_SERVICE
          ? {
              bookmarks: ['one', 'two', 'three'].map(id => ({
                subject: {
                  uri: `at://did:plc:ryoko/app.bsky.feed.post/${id}`,
                  cid: `bafy${id}`,
                },
              })),
            }
          : {bookmarks: []}
      }
      if (nsid === 'app.bsky.bookmark.createBookmark') {
        if ((input.uri as string).endsWith('/two')) {
          throw new XRPCError(400, 'InvalidRequest', 'Record not found')
        }
        written.push(input.uri as string)
        return undefined
      }
      throw new Error(`Unexpected method: ${nsid}`)
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['bookmarks']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.status).toBe('complete')
    expect(result.collections.bookmarks).toMatchObject({
      status: 'failed',
      sourceCount: 3,
      transferredCount: 2,
      failedCount: 1,
      failureAt: 'destination',
      failureStatus: 400,
      failureName: 'InvalidRequest',
    })
    expect(written.sort()).toEqual([
      'at://did:plc:ryoko/app.bsky.feed.post/one',
      'at://did:plc:ryoko/app.bsky.feed.post/three',
    ])
  })

  it('marks an unsupported destination collection without failing the run', async () => {
    const {agent, calls} = makeAgent((nsid, _input, service) => {
      if (nsid !== 'app.bsky.bookmark.getBookmarks') {
        throw new Error(`Unexpected method: ${nsid}`)
      }
      if (service === SOURCE_SERVICE) return {bookmarks: []}
      throw new XRPCError(404, 'XRPCNotSupported', 'Method not supported')
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['bookmarks']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.status).toBe('complete')
    expect(result.collections.bookmarks).toMatchObject({
      status: 'unsupported',
      unsupportedAt: 'destination',
    })
    expect(calls).toHaveLength(2)
  })

  it('retries rate-limited reads and honors retry-after', async () => {
    let attempts = 0
    const {agent} = makeAgent((nsid, _input, service) => {
      if (nsid !== 'app.bsky.graph.getListMutes') {
        throw new Error(`Unexpected method: ${nsid}`)
      }
      if (service === SOURCE_SERVICE && attempts++ === 0) {
        throw new XRPCError(429, 'RateLimitExceeded', 'Slow down', {
          'retry-after': '0',
        })
      }
      return {lists: []}
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['mutedLists']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(attempts).toBe(2)
    expect(result.collections.mutedLists).toMatchObject({status: 'complete'})
  })

  it('fails a collection when the appview repeats a pagination cursor', async () => {
    const {agent} = makeAgent(nsid => {
      if (nsid !== 'app.bsky.graph.getListMutes') {
        throw new Error(`Unexpected method: ${nsid}`)
      }
      return {
        lists: [{uri: 'at://did:plc:ryoko/app.bsky.graph.list/one'}],
        cursor: 'stuck',
      }
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['mutedLists']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.status).toBe('complete')
    expect(result.collections.mutedLists).toMatchObject({
      status: 'failed',
      failureName: 'UnexpectedError',
    })
  })

  it('reads past an empty page that carries a new cursor', async () => {
    /* An appview can drop a whole page while it hydrates the results. */
    const pages: Record<string, {lists: {uri: string}[]; cursor?: string}> = {
      start: {lists: [{uri: 'at://did:plc:ryoko/one'}], cursor: 'second'},
      second: {lists: [], cursor: 'third'},
      third: {lists: [{uri: 'at://did:plc:ryoko/two'}]},
    }
    const {agent} = makeAgent((nsid, input, service) => {
      if (nsid === 'app.bsky.graph.muteActorList') return undefined
      if (nsid !== 'app.bsky.graph.getListMutes') {
        throw new Error(`Unexpected method: ${nsid}`)
      }
      if (service !== SOURCE_SERVICE) return {lists: []}
      return pages[(input.cursor as string) ?? 'start']
    })

    const result = await runAppViewTransfer({
      agent,
      initialCheckpoint: checkpointFor(['mutedLists']),
      signal: new AbortController().signal,
      onProgress: () => {},
    })

    expect(result.collections.mutedLists).toMatchObject({
      status: 'complete',
      sourceCount: 2,
      transferredCount: 2,
    })
  })

  it('sorts the selection into transfer order', () => {
    const checkpoint = checkpointFor([
      'notificationPreferences',
      'mutedAccounts',
      'bookmarks',
    ])
    expect(checkpoint.selectedCollections).toEqual([
      'mutedAccounts',
      'bookmarks',
      'notificationPreferences',
    ])
  })

  it('rejects when aborted so the caller can persist a paused checkpoint', async () => {
    const controller = new AbortController()
    const {agent} = makeAgent(nsid => {
      if (nsid === 'app.bsky.graph.getMutes') {
        controller.abort()
        return {mutes: [{did: 'did:plc:ryoko'}]}
      }
      throw new Error(`Unexpected method: ${nsid}`)
    })

    await expect(
      runAppViewTransfer({
        agent,
        initialCheckpoint: checkpointFor(['mutedAccounts']),
        signal: controller.signal,
        onProgress: () => {},
      }),
    ).rejects.toThrow('Transfer paused')
  })
})
