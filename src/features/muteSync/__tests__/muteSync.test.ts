import {type AtpAgent} from '@atproto/api'
import {beforeEach, describe, expect, it, jest} from '@jest/globals'

jest.mock('react-native-mmkv', () => ({
  MMKV: class MMKVMock {
    _store = new Map<string, string>()

    set(key: string, value: string) {
      this._store.set(key, value)
    }

    getString(key: string) {
      return this._store.get(key)
    }

    delete(key: string) {
      this._store.delete(key)
    }
  },
}))

import {FALLBACK_APPVIEW} from '#/brand/appview'
import {account} from '#/storage'
import {fallbackProxyOpts, replayMuteWriteToFallback} from '../fanout'
import {reconcileMutes} from '../reconcile'

const BLACKSKY_APPVIEW = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community' as const,
  syncMutesWithFallback: true,
}

const DEV_APPVIEW = {
  url: 'http://localhost:2584',
  did: 'did:web:localhost' as const,
}

const FALLBACK_OPTS = {
  headers: {'atproto-proxy': `${FALLBACK_APPVIEW.did}#bsky_appview`},
}

/* Mute sync is beta-gated; the session account opts in, the outsider not. */
const SESSION_DID = 'did:plc:asuka-langley'
const NON_BETA_DID = 'did:plc:toji-suzuhara'

beforeEach(() => {
  account.set([SESSION_DID, 'isBetaUser'], true)
  account.set([NON_BETA_DID, 'isBetaUser'], false)
})

describe('fallbackProxyOpts', () => {
  it('returns the fallback proxy header for a routed appview', () => {
    expect(fallbackProxyOpts(BLACKSKY_APPVIEW, SESSION_DID)).toEqual(
      FALLBACK_OPTS,
    )
  })

  it('returns null when the routed appview is the fallback', () => {
    expect(fallbackProxyOpts(FALLBACK_APPVIEW, SESSION_DID)).toBeNull()
  })

  it('returns null when the routed appview does not opt in', () => {
    expect(fallbackProxyOpts(DEV_APPVIEW, SESSION_DID)).toBeNull()
  })

  it('returns null when the account is not a beta user', () => {
    expect(fallbackProxyOpts(BLACKSKY_APPVIEW, NON_BETA_DID)).toBeNull()
    expect(fallbackProxyOpts(BLACKSKY_APPVIEW, 'did:plc:unknown')).toBeNull()
    expect(fallbackProxyOpts(BLACKSKY_APPVIEW, undefined)).toBeNull()
  })
})

describe('replayMuteWriteToFallback', () => {
  it('replays the write with the fallback proxy header', async () => {
    const replay = jest.fn<() => Promise<unknown>>().mockResolvedValue({})
    await replayMuteWriteToFallback(BLACKSKY_APPVIEW, SESSION_DID, replay)
    expect(replay).toHaveBeenCalledWith(FALLBACK_OPTS)
  })

  it('skips the replay when the routed appview is the fallback', async () => {
    const replay = jest.fn<() => Promise<unknown>>()
    await replayMuteWriteToFallback(FALLBACK_APPVIEW, SESSION_DID, replay)
    expect(replay).not.toHaveBeenCalled()
  })

  it('skips the replay when the account is not a beta user', async () => {
    const replay = jest.fn<() => Promise<unknown>>()
    await replayMuteWriteToFallback(BLACKSKY_APPVIEW, NON_BETA_DID, replay)
    expect(replay).not.toHaveBeenCalled()
  })

  it('swallows a replay failure', async () => {
    const replay = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValue(new Error('boom'))
    await expect(
      replayMuteWriteToFallback(BLACKSKY_APPVIEW, SESSION_DID, replay),
    ).resolves.toBeUndefined()
  })
})

type Page<T> = {data: T}

function pageResponse<T>(data: T): Promise<Page<T>> {
  return Promise.resolve({data})
}

/*
 * Builds a mock agent whose graph endpoints answer from fixtures. The
 * fallback appview responds when the call carries the fallback proxy
 * header; the routed appview responds otherwise.
 */
type CallOpts = {headers?: Record<string, string>}

function makeAgent({
  sourceLists = [],
  targetLists = [],
  sourceMutes = [],
  targetMutes = [],
  hasSession = true,
  sessionDid = SESSION_DID,
}: {
  sourceLists?: {uri: string}[]
  targetLists?: {uri: string}[]
  sourceMutes?: {did: string; viewer?: object}[]
  targetMutes?: {did: string; viewer?: object}[]
  hasSession?: boolean
  sessionDid?: string
}) {
  const isFallbackCall = (opts?: CallOpts) =>
    opts?.headers?.['atproto-proxy'] === `${FALLBACK_APPVIEW.did}#bsky_appview`
  const getListMutes = jest.fn(
    (
      _params: unknown,
      opts?: CallOpts,
    ): Promise<Page<{lists: {uri: string}[]; cursor?: string}>> =>
      pageResponse({
        lists: isFallbackCall(opts) ? sourceLists : targetLists,
      }),
  )
  const getMutes = jest.fn(
    (
      _params: unknown,
      opts?: CallOpts,
    ): Promise<
      Page<{mutes: {did: string; viewer?: object}[]; cursor?: string}>
    > =>
      pageResponse({
        mutes: isFallbackCall(opts) ? sourceMutes : targetMutes,
      }),
  )
  const muteActorList = jest.fn(() => pageResponse({}))
  const muteActor = jest.fn(() => pageResponse({}))
  const agent = {
    session: hasSession ? {did: sessionDid} : undefined,
    app: {
      bsky: {
        graph: {getListMutes, getMutes, muteActorList, muteActor},
      },
    },
  } as unknown as AtpAgent
  return {agent, getListMutes, getMutes, muteActorList, muteActor}
}

describe('reconcileMutes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does nothing when the routed appview is the fallback', async () => {
    const {agent, getListMutes} = makeAgent({})
    await reconcileMutes(agent, FALLBACK_APPVIEW)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('does nothing without a session', async () => {
    const {agent, getListMutes} = makeAgent({hasSession: false})
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('does nothing when the account is not a beta user', async () => {
    const {agent, getListMutes} = makeAgent({sessionDid: NON_BETA_DID})
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('imports list mutes missing from the routed appview', async () => {
    const {agent, muteActorList} = makeAgent({
      sourceLists: [
        {uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'},
        {uri: 'at://did:plc:nerv/app.bsky.graph.list/geofront'},
      ],
      targetLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/geofront'}],
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActorList).toHaveBeenCalledTimes(1)
    expect(muteActorList).toHaveBeenCalledWith({
      list: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3',
    })
  })

  it('imports actor mutes and keeps the mute scope', async () => {
    const {agent, muteActor} = makeAgent({
      sourceMutes: [
        {did: 'did:plc:shinji-ikari', viewer: {muted: true}},
        {
          did: 'did:plc:rei-ayanami',
          viewer: {muted: false, mutedOnlyReposts: true},
        },
      ],
      targetMutes: [],
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActor).toHaveBeenCalledTimes(2)
    expect(muteActor).toHaveBeenCalledWith({actor: 'did:plc:shinji-ikari'})
    expect(muteActor).toHaveBeenCalledWith({
      actor: 'did:plc:rei-ayanami',
      onlyReposts: true,
    })
  })

  it('writes nothing when both appviews agree', async () => {
    const {agent, muteActor, muteActorList} = makeAgent({
      sourceLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'}],
      targetLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'}],
      sourceMutes: [{did: 'did:plc:misato-katsuragi', viewer: {muted: true}}],
      targetMutes: [{did: 'did:plc:misato-katsuragi', viewer: {muted: true}}],
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActorList).not.toHaveBeenCalled()
    expect(muteActor).not.toHaveBeenCalled()
  })

  it('follows pagination cursors from the fallback appview', async () => {
    const {agent, getListMutes, muteActorList} = makeAgent({})
    const pages: {lists: {uri: string}[]; cursor?: string}[] = [
      {
        lists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/page1'}],
        cursor: 'next',
      },
      {
        lists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/page2'}],
      },
    ]
    let call = 0
    getListMutes.mockImplementation((_params: unknown, opts?: CallOpts) => {
      if (opts?.headers?.['atproto-proxy']) {
        return pageResponse(pages[Math.min(call++, pages.length - 1)])
      }
      return pageResponse({lists: [] as {uri: string}[]})
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActorList).toHaveBeenCalledTimes(2)
  })

  it('follows the cursor past the tenth page', async () => {
    const {agent, getListMutes, muteActorList} = makeAgent({})
    const pageCount = 12
    let call = 0
    getListMutes.mockImplementation((_params: unknown, opts?: CallOpts) => {
      if (opts?.headers?.['atproto-proxy']) {
        const page = call++
        return pageResponse({
          lists: [{uri: `at://did:plc:nerv/app.bsky.graph.list/page${page}`}],
          cursor: page < pageCount - 1 ? `cursor-${page}` : undefined,
        })
      }
      return pageResponse({lists: [] as {uri: string}[]})
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActorList).toHaveBeenCalledTimes(pageCount)
    expect(muteActorList).toHaveBeenCalledWith({
      list: 'at://did:plc:nerv/app.bsky.graph.list/page11',
    })
  })

  it('stops paginating on an empty page that still carries a cursor', async () => {
    const {agent, getListMutes, muteActorList} = makeAgent({})
    getListMutes.mockImplementation(() =>
      pageResponse({lists: [] as {uri: string}[], cursor: 'endless'}),
    )
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(getListMutes).toHaveBeenCalledTimes(2)
    expect(muteActorList).not.toHaveBeenCalled()
  })

  it('writes every missing mute and caps write concurrency', async () => {
    const sourceMutes = Array.from({length: 25}, (_, i) => ({
      did: `did:plc:eva-pilot-${i}`,
      viewer: {muted: true},
    }))
    const {agent, muteActor} = makeAgent({sourceMutes, targetMutes: []})
    let inFlight = 0
    let maxInFlight = 0
    muteActor.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight--
      return {data: {}}
    })
    await reconcileMutes(agent, BLACKSKY_APPVIEW)
    expect(muteActor).toHaveBeenCalledTimes(25)
    /* Matches WRITE_BATCH_SIZE in reconcile.ts. */
    expect(maxInFlight).toBeLessThanOrEqual(10)
  })

  it('swallows a reconciliation failure', async () => {
    const {agent, getListMutes} = makeAgent({})
    getListMutes.mockImplementation(() => Promise.reject(new Error('boom')))
    await expect(
      reconcileMutes(agent, BLACKSKY_APPVIEW),
    ).resolves.toBeUndefined()
  })
})
