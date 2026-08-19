import {type Client} from '@atproto/lex'

import {type AppView} from '#/brand/appview'
import {app} from '#/lexicons'
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

/**
 * A lex client stub that dispatches `call` to one jest mock per lexicon
 * method, so tests can assert on each endpoint on its own.
 */
function makeClient({
  profiles = [],
  actors = [],
}: {
  profiles?: unknown[]
  actors?: unknown[]
} = {}) {
  const searchActorsTypeahead = jest.fn().mockResolvedValue({actors})
  const getProfiles = jest.fn().mockResolvedValue({profiles})
  return {
    call: (method: unknown, params: unknown) => {
      if (method === app.bsky.actor.searchActorsTypeahead) {
        return searchActorsTypeahead(params)
      }
      if (method === app.bsky.actor.getProfiles) {
        return getProfiles(params)
      }
      throw new Error('unexpected lexicon method')
    },
    searchActorsTypeahead,
    getProfiles,
  } as unknown as Client & {
    searchActorsTypeahead: jest.Mock
    getProfiles: jest.Mock
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('searchActorsTypeaheadVia', () => {
  it('uses the appview when it serves typeahead itself', async () => {
    const client = makeClient({actors: [KUSANAGI]})

    const result = await searchActorsTypeaheadVia(OWN_APPVIEW, client, {
      q: 'kusa',
      limit: 8,
    })

    expect(result).toEqual([KUSANAGI])
    expect(client.searchActorsTypeahead).toHaveBeenCalledWith({
      q: 'kusa',
      limit: 8,
    })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(client.getProfiles).not.toHaveBeenCalled()
  })

  /*
   * The service omits `viewer`, so moderateProfile cannot see mutes or blocks
   * until it is filled in from the account's own appview.
   */
  it('hydrates viewer and labels from the account appview', async () => {
    serviceReturns([KUSANAGI])
    const client = makeClient({
      profiles: [{...KUSANAGI, viewer: {muted: true}, labels: [{val: 'spam'}]}],
    })

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'kusa',
      limit: 8,
    })

    expect(result).toEqual([
      {...KUSANAGI, viewer: {muted: true}, labels: [{val: 'spam'}]},
    ])
    expect(client.getProfiles).toHaveBeenCalledWith({
      actors: ['did:plc:kusanagi'],
    })
    expect(client.searchActorsTypeahead).not.toHaveBeenCalled()
  })

  /*
   * The service permits only Content-Type, Authorization, and X-Client at the
   * CORS preflight. A lex client puts an `atproto-accept-labelers` header on
   * every request, which the browser then blocks. The request must carry only
   * the attribution header.
   */
  it('sends only the attribution header to the service', async () => {
    serviceReturns([])

    await searchActorsTypeaheadVia(FALLBACK_APPVIEW, makeClient(), {
      q: 'faye',
      limit: 8,
    })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://typeahead.waow.tech/xrpc/app.bsky.actor.searchActorsTypeahead?q=faye&limit=8',
    )
    expect(init.headers).toEqual({'X-Client': 'northsky.app'})
  })

  /*
   * The service is a third party and plain fetch does not check the response
   * against the lexicon, so a malformed body must not reach the caller.
   */
  it('ignores a response that is not a list of accounts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({actors: 'kusanagi'}),
    })
    const client = makeClient()

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'kusa',
      limit: 8,
    })

    expect(result).toEqual([])
    expect(client.getProfiles).not.toHaveBeenCalled()
  })

  it('drops entries that carry no DID', async () => {
    serviceReturns([KUSANAGI, null, {handle: 'ghost.northsky.social'}])
    const client = makeClient({profiles: [KUSANAGI]})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'kusa',
      limit: 8,
    })

    expect(client.getProfiles).toHaveBeenCalledWith({
      actors: ['did:plc:kusanagi'],
    })
    expect(result.map(actor => actor.did)).toEqual(['did:plc:kusanagi'])
  })

  it('surfaces a service error rather than returning nothing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    })

    await expect(
      searchActorsTypeaheadVia(FALLBACK_APPVIEW, makeClient(), {
        q: 'faye',
        limit: 8,
      }),
    ).rejects.toThrow('502')
  })

  it('keeps the ranking the service returned', async () => {
    serviceReturns([UTENA, KUSANAGI, FAYE])
    // The appview answers in a different order.
    const client = makeClient({profiles: [FAYE, UTENA, KUSANAGI]})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
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
    const client = makeClient({
      profiles: [{...KUSANAGI, viewer: {muted: true}}],
    })

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
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
    const client = makeClient({profiles: many.slice(0, 25)})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'actor',
      limit: 30,
    })

    expect(client.getProfiles).toHaveBeenCalledWith({
      actors: many.slice(0, 25).map(a => a.did),
    })
    expect(result).toHaveLength(25)
  })

  it('asks for each account once', async () => {
    serviceReturns([KUSANAGI, KUSANAGI, FAYE])
    const client = makeClient({profiles: [KUSANAGI, FAYE]})

    await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {q: 'a', limit: 8})

    expect(client.getProfiles).toHaveBeenCalledWith({
      actors: ['did:plc:kusanagi', 'did:plc:faye'],
    })
  })

  it('returns each account once', async () => {
    serviceReturns([KUSANAGI, KUSANAGI, FAYE])
    const client = makeClient({profiles: [KUSANAGI, FAYE]})

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'a',
      limit: 8,
    })

    expect(result.map(actor => actor.did)).toEqual([
      'did:plc:kusanagi',
      'did:plc:faye',
    ])
  })

  it('skips hydration when the service returns nothing', async () => {
    serviceReturns([])
    const client = makeClient()

    const result = await searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {
      q: 'nobody',
      limit: 8,
    })

    expect(result).toEqual([])
    expect(client.getProfiles).not.toHaveBeenCalled()
  })

  /*
   * Returning unhydrated results would reintroduce the moderation gap that
   * hydration exists to close, so the failure must surface instead.
   */
  it('propagates a hydration failure', async () => {
    serviceReturns([KUSANAGI])
    const client = makeClient()
    client.getProfiles.mockRejectedValue(new Error('appview down'))

    await expect(
      searchActorsTypeaheadVia(FALLBACK_APPVIEW, client, {q: 'kusa', limit: 8}),
    ).rejects.toThrow('appview down')
  })
})
