import {type Client} from '@atproto/lex'
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

import {type AppView, FALLBACK_APPVIEW} from '#/brand/appview'
import {app} from '#/lexicons'
import {account} from '#/storage'
import {fallbackProxyOpts, replayMuteWriteToFallback} from '../fanout'
import {runImportMuteWrite, runUserMuteWrite} from '../ordering'
import {reconcileMutes} from '../reconcile'

const BLACKSKY_APPVIEW: AppView = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
  syncMutesWithFallback: true,
}

const DEV_APPVIEW: AppView = {
  url: 'http://localhost:2584',
  did: 'did:web:localhost',
}

const FALLBACK_OPTS = {
  service: `${FALLBACK_APPVIEW.did}#bsky_appview`,
}

/* Mute sync is beta-gated; the session account opts in, the outsider not. */
const SESSION_DID = 'did:plc:asuka-langley'
const NON_BETA_DID = 'did:plc:toji-suzuhara'

beforeEach(() => {
  account.set([SESSION_DID, 'isBetaUser'], true)
  account.set([NON_BETA_DID, 'isBetaUser'], false)
})

describe('fallbackProxyOpts', () => {
  it('returns the fallback proxy options for a routed appview', () => {
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
  it('replays the write with the fallback proxy options', async () => {
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

/*
 * Builds a mock client whose `call` dispatches on the graph method object to
 * per-endpoint jest mocks answering from fixtures. The fallback appview
 * responds when the call carries the fallback `service` option; the routed
 * appview responds otherwise. Bodies are returned directly, as `client.call`
 * does. Write endpoints receive only their params, matching how reconcile
 * issues them (no proxy options).
 */
type CallOpts = {service?: string}

function makeClient({
  sourceLists = [],
  targetLists = [],
  sourceMutes = [],
  targetMutes = [],
}: {
  sourceLists?: {uri: string}[]
  targetLists?: {uri: string}[]
  sourceMutes?: {did: string; viewer?: object}[]
  targetMutes?: {did: string; viewer?: object}[]
}) {
  const isFallbackCall = (opts?: CallOpts) =>
    opts?.service === `${FALLBACK_APPVIEW.did}#bsky_appview`
  const getListMutes = jest.fn(
    (
      _params: unknown,
      opts?: CallOpts,
    ): Promise<{lists: {uri: string}[]; cursor?: string}> =>
      Promise.resolve({
        lists: isFallbackCall(opts) ? sourceLists : targetLists,
      }),
  )
  const getMutes = jest.fn(
    (
      _params: unknown,
      opts?: CallOpts,
    ): Promise<{mutes: {did: string; viewer?: object}[]; cursor?: string}> =>
      Promise.resolve({
        mutes: isFallbackCall(opts) ? sourceMutes : targetMutes,
      }),
  )
  const muteActorList = jest.fn((_params: unknown): Promise<object> =>
    Promise.resolve({}),
  )
  const muteActor = jest.fn((_params: unknown): Promise<object> =>
    Promise.resolve({}),
  )
  const client = {
    call: (method: unknown, params: unknown, opts?: CallOpts) => {
      switch (method) {
        case app.bsky.graph.getListMutes:
          return getListMutes(params, opts)
        case app.bsky.graph.getMutes:
          return getMutes(params, opts)
        case app.bsky.graph.muteActorList:
          return muteActorList(params)
        case app.bsky.graph.muteActor:
          return muteActor(params)
        default:
          return Promise.reject(new Error('unexpected method'))
      }
    },
  } as unknown as Client
  return {client, getListMutes, getMutes, muteActorList, muteActor}
}

describe('reconcileMutes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does nothing when the routed appview is the fallback', async () => {
    const {client, getListMutes} = makeClient({})
    await reconcileMutes(client, FALLBACK_APPVIEW, SESSION_DID)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('does nothing without a session', async () => {
    const {client, getListMutes} = makeClient({})
    await reconcileMutes(client, BLACKSKY_APPVIEW, undefined)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('does nothing when the account is not a beta user', async () => {
    const {client, getListMutes} = makeClient({})
    await reconcileMutes(client, BLACKSKY_APPVIEW, NON_BETA_DID)
    expect(getListMutes).not.toHaveBeenCalled()
  })

  it('imports list mutes missing from the routed appview', async () => {
    const {client, muteActorList} = makeClient({
      sourceLists: [
        {uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'},
        {uri: 'at://did:plc:nerv/app.bsky.graph.list/geofront'},
      ],
      targetLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/geofront'}],
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActorList).toHaveBeenCalledTimes(1)
    expect(muteActorList).toHaveBeenCalledWith({
      list: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3',
    })
  })

  it('imports actor mutes and keeps the mute scope', async () => {
    const {client, muteActor} = makeClient({
      sourceMutes: [
        {did: 'did:plc:shinji-ikari', viewer: {muted: true}},
        {
          did: 'did:plc:rei-ayanami',
          viewer: {muted: false, mutedOnlyReposts: true},
        },
      ],
      targetMutes: [],
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActor).toHaveBeenCalledTimes(2)
    expect(muteActor).toHaveBeenCalledWith({actor: 'did:plc:shinji-ikari'})
    expect(muteActor).toHaveBeenCalledWith({
      actor: 'did:plc:rei-ayanami',
      onlyReposts: true,
    })
  })

  it('writes nothing when both appviews agree', async () => {
    const {client, muteActor, muteActorList} = makeClient({
      sourceLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'}],
      targetLists: [{uri: 'at://did:plc:nerv/app.bsky.graph.list/tokyo3'}],
      sourceMutes: [{did: 'did:plc:misato-katsuragi', viewer: {muted: true}}],
      targetMutes: [{did: 'did:plc:misato-katsuragi', viewer: {muted: true}}],
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActorList).not.toHaveBeenCalled()
    expect(muteActor).not.toHaveBeenCalled()
  })

  it('follows pagination cursors from the fallback appview', async () => {
    const {client, getListMutes, muteActorList} = makeClient({})
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
      if (opts?.service) {
        return Promise.resolve(pages[Math.min(call++, pages.length - 1)])
      }
      return Promise.resolve({lists: [] as {uri: string}[]})
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActorList).toHaveBeenCalledTimes(2)
  })

  it('follows the cursor past the tenth page', async () => {
    const {client, getListMutes, muteActorList} = makeClient({})
    const pageCount = 12
    let call = 0
    getListMutes.mockImplementation((_params: unknown, opts?: CallOpts) => {
      if (opts?.service) {
        const page = call++
        return Promise.resolve({
          lists: [{uri: `at://did:plc:nerv/app.bsky.graph.list/page${page}`}],
          cursor: page < pageCount - 1 ? `cursor-${page}` : undefined,
        })
      }
      return Promise.resolve({lists: [] as {uri: string}[]})
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActorList).toHaveBeenCalledTimes(pageCount)
    expect(muteActorList).toHaveBeenCalledWith({
      list: 'at://did:plc:nerv/app.bsky.graph.list/page11',
    })
  })

  it('stops paginating on an empty page that still carries a cursor', async () => {
    const {client, getListMutes, muteActorList} = makeClient({})
    getListMutes.mockImplementation(() =>
      Promise.resolve({lists: [] as {uri: string}[], cursor: 'endless'}),
    )
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(getListMutes).toHaveBeenCalledTimes(2)
    expect(muteActorList).not.toHaveBeenCalled()
  })

  it('writes every missing mute and caps write concurrency', async () => {
    const sourceMutes = Array.from({length: 25}, (_, i) => ({
      did: `did:plc:eva-pilot-${i}`,
      viewer: {muted: true},
    }))
    const {client, muteActor} = makeClient({sourceMutes, targetMutes: []})
    let inFlight = 0
    let maxInFlight = 0
    muteActor.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight--
      return {}
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActor).toHaveBeenCalledTimes(25)
    /* Matches WRITE_BATCH_SIZE in reconcile.ts. */
    expect(maxInFlight).toBeLessThanOrEqual(10)
  })

  it('swallows a reconciliation failure', async () => {
    const {client, getListMutes} = makeClient({})
    getListMutes.mockImplementation(() => Promise.reject(new Error('boom')))
    await expect(
      reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID),
    ).resolves.toBeUndefined()
  })

  it('drops an import for an actor the user changed during the run', async () => {
    const unmuted = 'did:plc:rei-ayanami'
    const {client, getMutes, muteActor} = makeClient({
      sourceMutes: [
        {did: 'did:plc:shinji-ikari', viewer: {muted: true}},
        {did: unmuted, viewer: {muted: true}},
      ],
      targetMutes: [],
    })
    const readTargetMutes = getMutes.getMockImplementation()!
    getMutes.mockImplementation(async (params: unknown, opts?: CallOpts) => {
      const res = await readTargetMutes(params, opts)
      if (!opts?.service) {
        /* The user unmutes while the snapshot is still being read. */
        await runUserMuteWrite(unmuted, () => Promise.resolve())
      }
      return res
    })
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActor).toHaveBeenCalledTimes(1)
    expect(muteActor).toHaveBeenCalledWith({actor: 'did:plc:shinji-ikari'})
  })

  it('drops an import for a list the user changed during the run', async () => {
    const unmuted = 'at://did:plc:nerv/app.bsky.graph.list/geofront'
    const {client, getListMutes, muteActorList} = makeClient({
      sourceLists: [{uri: unmuted}],
      targetLists: [],
    })
    const readTargetLists = getListMutes.getMockImplementation()!
    getListMutes.mockImplementation(
      async (params: unknown, opts?: CallOpts) => {
        const res = await readTargetLists(params, opts)
        if (!opts?.service) {
          await runUserMuteWrite(unmuted, () => Promise.resolve())
        }
        return res
      },
    )
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActorList).not.toHaveBeenCalled()
  })

  it('imports again on the next run after the user action', async () => {
    const {client, muteActor} = makeClient({
      sourceMutes: [{did: 'did:plc:kaworu-nagisa', viewer: {muted: true}}],
      targetMutes: [],
    })
    await runUserMuteWrite('did:plc:kaworu-nagisa', () => Promise.resolve())
    await reconcileMutes(client, BLACKSKY_APPVIEW, SESSION_DID)
    expect(muteActor).toHaveBeenCalledTimes(1)
  })
})

describe('mute write ordering', () => {
  it('runs a user write after an import write for the same subject', async () => {
    const order: string[] = []
    const subject = 'did:plc:gendo-ikari'
    const importWrite = runImportMuteWrite(subject, async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      order.push('import')
    })
    const userWrite = runUserMuteWrite(subject, () => {
      order.push('user')
      return Promise.resolve()
    })
    await Promise.all([importWrite, userWrite])
    expect(order).toEqual(['import', 'user'])
  })

  it('keeps the chain running after a failed write', async () => {
    const subject = 'did:plc:ritsuko-akagi'
    const failing = runUserMuteWrite(subject, () =>
      Promise.reject(new Error('boom')),
    )
    await expect(failing).rejects.toThrow('boom')
    await expect(
      runUserMuteWrite(subject, () => Promise.resolve('ok')),
    ).resolves.toBe('ok')
  })
})
