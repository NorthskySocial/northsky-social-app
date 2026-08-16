import {type AtpAgent} from '@atproto/api'

import {type AppView} from '#/brand/appview'
import {searchActorsTypeaheadVia} from '../client'

const mockFetch = jest.fn()
globalThis.fetch = mockFetch

/** Answers as the typeahead service does, with a bare JSON body. */
function serviceReturns(actors: unknown[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({actors}),
  })
}

const OWN_APPVIEW: AppView = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
}
const FALLBACK_APPVIEW: AppView = {...OWN_APPVIEW, useFallbackTypeahead: true}

const KUSANAGI = {did: 'did:plc:kusanagi', handle: 'kusanagi.northsky.social'}
const FAYE = {did: 'did:plc:faye', handle: 'faye.northsky.social'}
const UTENA = {did: 'did:plc:utena', handle: 'utena.northsky.social'}

function makeAgent({
  profiles = [],
  actors = [],
}: {
  profiles?: unknown[]
  actors?: unknown[]
} = {}) {
  return {
    searchActorsTypeahead: jest.fn().mockResolvedValue({data: {actors}}),
    getProfiles: jest.fn().mockResolvedValue({data: {profiles}}),
  } as unknown as AtpAgent & {
    searchActorsTypeahead: jest.Mock
    getProfiles: jest.Mock
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('searchActorsTypeaheadVia', () => {
  it('uses the appview when it serves typeahead itself', async () => {
    const agent = makeAgent({actors: [KUSANAGI]})

    const result = await searchActorsTypeaheadVia(OWN_APPVIEW, agent, {
      q: 'kusa',
      limit: 8,
    })

    expect(result).toEqual([KUSANAGI])
    expect(agent.searchActorsTypeahead).toHaveBeenCalledWith({
      q: 'kusa',
      limit: 8,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(agent.getProfiles).not.toHaveBeenCalled()
  })

  /*
   * The service omits `viewer`, so moderateProfile cannot see mutes or blocks
   * until it is filled in from the account's own appview.
   */
  it('hydrates viewer and labels from the account appview', async () => {
    serviceReturns([KUSANAGI])
    const agent = makeAgent({
      profiles: [{...KUSANAGI, viewer: {muted: true}, labels: [{val: 'spam'}]}],
    })

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {
      q: 'kusa',
      limit: 8,
    })

    expect(result).toEqual([
      {...KUSANAGI, viewer: {muted: true}, labels: [{val: 'spam'}]},
    ])
    expect(agent.getProfiles).toHaveBeenCalledWith({
      actors: ['did:plc:kusanagi'],
    })
    expect(agent.searchActorsTypeahead).not.toHaveBeenCalled()
  })

  /*
   * The service permits only Content-Type, Authorization, and X-Client at the
   * CORS preflight. An atproto agent puts an `atproto-accept-labelers` header
   * on every request, which the browser then blocks, so the request must carry
   * the attribution header and nothing more.
   */
  it('sends only the attribution header to the service', async () => {
    serviceReturns([])

    await searchActorsTypeaheadVia(FALLBACK_APPVIEW, makeAgent(), {
      q: 'faye',
      limit: 8,
    })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://typeahead.waow.tech/xrpc/app.bsky.actor.searchActorsTypeahead?q=faye&limit=8',
    )
    expect(init.headers).toEqual({'X-Client': 'northsky.app'})
  })

  it('surfaces a service error rather than returning nothing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    })

    await expect(
      searchActorsTypeaheadVia(FALLBACK_APPVIEW, makeAgent(), {
        q: 'faye',
        limit: 8,
      }),
    ).rejects.toThrow('502')
  })

  it('keeps the ranking the service returned', async () => {
    serviceReturns([UTENA, KUSANAGI, FAYE])
    // The appview answers in a different order.
    const agent = makeAgent({profiles: [FAYE, UTENA, KUSANAGI]})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {
      q: 'a',
      limit: 8,
    })

    expect(result.map(actor => actor.did)).toEqual([
      'did:plc:utena',
      'did:plc:kusanagi',
      'did:plc:faye',
    ])
  })

  /*
   * The appview omits deactivated, suspended, and takendown accounts. Such an
   * entry carries neither viewer nor labels, so moderateProfile would pass it
   * unconditionally. Dropping it fails closed.
   */
  it('drops an account the appview does not return', async () => {
    serviceReturns([KUSANAGI, FAYE])
    const agent = makeAgent({profiles: [{...KUSANAGI, viewer: {muted: true}}]})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {
      q: 'a',
      limit: 8,
    })

    expect(result).toEqual([
      {...KUSANAGI, viewer: {muted: true}, labels: undefined},
    ])
  })

  /*
   * The service decides how many accounts it returns, and getProfiles rejects
   * more than 25 actors in one call.
   */
  it('caps hydration at the getProfiles limit', async () => {
    const many = Array.from({length: 30}, (_, i) => ({
      did: `did:plc:actor${i}`,
      handle: `actor${i}.northsky.social`,
    }))
    serviceReturns(many)
    const agent = makeAgent({profiles: many.slice(0, 25)})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {
      q: 'actor',
      limit: 30,
    })

    expect(agent.getProfiles).toHaveBeenCalledWith({
      actors: many.slice(0, 25).map(a => a.did),
    })
    expect(result).toHaveLength(25)
  })

  it('asks for each account once', async () => {
    serviceReturns([KUSANAGI, KUSANAGI, FAYE])
    const agent = makeAgent({profiles: [KUSANAGI, FAYE]})

    await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {q: 'a', limit: 8})

    expect(agent.getProfiles).toHaveBeenCalledWith({
      actors: ['did:plc:kusanagi', 'did:plc:faye'],
    })
  })

  it('skips hydration when the service returns nothing', async () => {
    serviceReturns([])
    const agent = makeAgent()

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {
      q: 'nobody',
      limit: 8,
    })

    expect(result).toEqual([])
    expect(agent.getProfiles).not.toHaveBeenCalled()
  })

  /*
   * Returning unhydrated results would reintroduce the moderation gap that
   * hydration exists to close, so the failure must surface instead.
   */
  it('propagates a hydration failure', async () => {
    serviceReturns([KUSANAGI])
    const agent = makeAgent()
    agent.getProfiles.mockRejectedValue(new Error('appview down'))

    await expect(
      searchActorsTypeaheadVia(FALLBACK_APPVIEW, agent, {q: 'kusa', limit: 8}),
    ).rejects.toThrow('appview down')
  })
})
