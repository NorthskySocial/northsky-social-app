import {type AtpAgent} from '@atproto/api'
import {describe, expect, it, jest} from '@jest/globals'

import {BLUESKY_PROXY_HEADER} from '#/lib/constants'
import {FALLBACK_APPVIEW} from '#/brand/appview'
import {
  type BskyAppAgent,
  configureAppviewProxy,
  getAppviewForAgent,
  stripAppviewProxyForPdsLocalMethods,
} from '../agent'

jest.mock('jwt-decode', () => ({
  jwtDecode(_token: string) {
    return {}
  },
}))

jest.mock('../../birthdate')
jest.mock('../../../ageAssurance/data')
jest.mock('../../../ageAssurance/state', () => ({
  unsafeGetAndComputeAgeAssurance: () => ({state: {}}),
}))
jest.mock('#/lib/notifications/notifications', () => ({
  unregisterPushToken(_agents: AtpAgent[]) {
    return Promise.resolve()
  },
}))

const BLACKSKY_APPVIEW = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
  searchProxyDid: FALLBACK_APPVIEW.did,
  useFallbackTypeahead: true,
}

function makeAgent(serviceUrl: string | undefined) {
  return {
    serviceUrl: serviceUrl ? new URL(serviceUrl) : undefined,
    configureProxy: jest.fn(),
  } as unknown as BskyAppAgent
}

describe('configureAppviewProxy', () => {
  it('routes northsky.social logins to the Blacksky appview', () => {
    const agent = makeAgent('https://northsky.social')
    configureAppviewProxy(agent)
    expect(agent.appview).toEqual(BLACKSKY_APPVIEW)
    expect(agent.configureProxy).toHaveBeenCalledWith(
      `${BLACKSKY_APPVIEW.did}#bsky_appview`,
    )
  })

  it('falls back to Bluesky for unmatched hosts', () => {
    const agent = makeAgent('https://bsky.social')
    configureAppviewProxy(agent)
    expect(agent.appview).toEqual(FALLBACK_APPVIEW)
    expect(agent.configureProxy).toHaveBeenCalledWith(
      `${FALLBACK_APPVIEW.did}#bsky_appview`,
    )
  })

  it('lets the E2E override win the header but keeps the resolved appview', () => {
    BLUESKY_PROXY_HEADER.set('did:plc:e2etest#bsky_appview')
    try {
      const agent = makeAgent('https://northsky.social')
      configureAppviewProxy(agent)
      expect(agent.configureProxy).toHaveBeenCalledWith(
        'did:plc:e2etest#bsky_appview',
      )
      expect(agent.appview).toEqual(BLACKSKY_APPVIEW)
    } finally {
      BLUESKY_PROXY_HEADER.override = undefined
    }
  })
})

describe('stripAppviewProxyForPdsLocalMethods', () => {
  const PROXY = 'atproto-proxy'
  const PROXY_VALUE = 'did:web:api.blacksky.community#bsky_appview'
  const GET_PREFS = 'https://northsky.social/xrpc/app.bsky.actor.getPreferences'
  const PUT_PREFS = 'https://northsky.social/xrpc/app.bsky.actor.putPreferences'
  const TIMELINE = 'https://northsky.social/xrpc/app.bsky.feed.getTimeline'

  function authed(extra?: Record<string, string>): RequestInit {
    return {
      method: 'GET',
      headers: {
        [PROXY]: PROXY_VALUE,
        authorization: 'Bearer kusanagi',
        ...extra,
      },
    }
  }

  function header(init: RequestInit | undefined, name: string) {
    return new Headers(init?.headers).get(name)
  }

  it('strips the proxy header on getPreferences', () => {
    const out = stripAppviewProxyForPdsLocalMethods(GET_PREFS, authed())
    expect(header(out, PROXY)).toBeNull()
  })

  it('strips the proxy header on putPreferences', () => {
    const out = stripAppviewProxyForPdsLocalMethods(PUT_PREFS, authed())
    expect(header(out, PROXY)).toBeNull()
  })

  it('keeps the other headers while stripping the proxy header', () => {
    const out = stripAppviewProxyForPdsLocalMethods(GET_PREFS, authed())
    expect(header(out, PROXY)).toBeNull()
    expect(header(out, 'authorization')).toBe('Bearer kusanagi')
  })

  it('leaves the proxy header alone for other methods', () => {
    const init = authed()
    const out = stripAppviewProxyForPdsLocalMethods(TIMELINE, init)
    expect(out).toBe(init)
    expect(header(out, PROXY)).toBe(PROXY_VALUE)
  })

  /*
   * Account creation calls these methods before a session exists. Stripping
   * there made signup fail with a bare 401 in the Blacksky fork.
   */
  it('leaves requests without an authorization header alone', () => {
    const init: RequestInit = {method: 'GET', headers: {[PROXY]: PROXY_VALUE}}
    const out = stripAppviewProxyForPdsLocalMethods(GET_PREFS, init)
    expect(out).toBe(init)
    expect(header(out, PROXY)).toBe(PROXY_VALUE)
  })

  /*
   * A search for the text of a method name puts it in the query string. That
   * request must keep its proxy header and reach its own appview.
   */
  it('leaves a request that only mentions a method in its query alone', () => {
    const init = authed()
    const out = stripAppviewProxyForPdsLocalMethods(
      'https://northsky.social/xrpc/app.bsky.feed.searchPostsV2?query=app.bsky.actor.getPreferences',
      init,
    )
    expect(header(out, PROXY)).toBe(PROXY_VALUE)
  })

  it('leaves a method served under another namespace alone', () => {
    const init = authed()
    const out = stripAppviewProxyForPdsLocalMethods(
      'https://northsky.social/xrpc/app.bsky.notification.getPreferences',
      init,
    )
    expect(header(out, PROXY)).toBe(PROXY_VALUE)
  })

  /*
   * The React Native URL adds a trailing slash to a path that has no query
   * string. The strip must still find the method.
   */
  it('accepts a path with a trailing slash', () => {
    const out = stripAppviewProxyForPdsLocalMethods(`${GET_PREFS}/`, authed())
    expect(header(out, PROXY)).toBeNull()
  })

  it('accepts a URL instance', () => {
    const out = stripAppviewProxyForPdsLocalMethods(
      new URL(GET_PREFS),
      authed(),
    )
    expect(header(out, PROXY)).toBeNull()
  })

  /*
   * The shape that actually reaches this code. CredentialSession.fetchHandler
   * builds a Request and calls fetch with it alone, so `init` is undefined and
   * the headers live on the request.
   */
  describe('when fetch is called with a Request and no init', () => {
    it('strips the proxy header off the request', () => {
      const req = new Request(GET_PREFS, authed())
      stripAppviewProxyForPdsLocalMethods(req, undefined)
      expect(req.headers.get(PROXY)).toBeNull()
      expect(req.headers.get('authorization')).toBe('Bearer kusanagi')
    })

    it('strips the proxy header on putPreferences', () => {
      const req = new Request(PUT_PREFS, {...authed(), method: 'POST'})
      stripAppviewProxyForPdsLocalMethods(req, undefined)
      expect(req.headers.get(PROXY)).toBeNull()
    })

    it('leaves the proxy header alone for other methods', () => {
      const req = new Request(TIMELINE, authed())
      stripAppviewProxyForPdsLocalMethods(req, undefined)
      expect(req.headers.get(PROXY)).toBe(PROXY_VALUE)
    })

    it('leaves an unauthenticated request alone', () => {
      const req = new Request(GET_PREFS, {headers: {[PROXY]: PROXY_VALUE}})
      stripAppviewProxyForPdsLocalMethods(req, undefined)
      expect(req.headers.get(PROXY)).toBe(PROXY_VALUE)
    })
  })
})

describe('getAppviewForAgent', () => {
  it('returns the appview stored on the agent', () => {
    const agent = makeAgent('https://northsky.social')
    configureAppviewProxy(agent)
    expect(getAppviewForAgent(agent)).toEqual(BLACKSKY_APPVIEW)
  })

  /*
   * The temporary logout agents (createTemporaryAgentsAndResume) are plain
   * AtpAgents with no `appview` field, so push-token unregistration must
   * resolve the route from the service URL.
   */
  it('resolves plain agents from their service URL', () => {
    const agent = {
      serviceUrl: new URL('https://northsky.social'),
    } as unknown as AtpAgent
    expect(getAppviewForAgent(agent)).toEqual(BLACKSKY_APPVIEW)
  })

  it('falls back for plain agents on unknown or missing hosts', () => {
    expect(getAppviewForAgent({} as AtpAgent)).toEqual(FALLBACK_APPVIEW)
    const agent = {
      serviceUrl: new URL('https://bsky.social'),
    } as unknown as AtpAgent
    expect(getAppviewForAgent(agent)).toEqual(FALLBACK_APPVIEW)
  })
})
