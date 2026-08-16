import {type AtpAgent} from '@atproto/api'
import {describe, expect, it, jest} from '@jest/globals'

import {BLUESKY_PROXY_HEADER} from '#/lib/constants'
import {FALLBACK_APPVIEW} from '#/brand/appview'
import {
  type BskyAppAgent,
  configureAppviewProxy,
  getAppviewForAgent,
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
