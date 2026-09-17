import {type Agent} from '@atproto/lex'
import {describe, expect, it, jest} from '@jest/globals'

import {BLUESKY_PROXY_HEADER} from '#/lib/constants'
import {FALLBACK_APPVIEW, resolveAppViewForService} from '#/brand/appview'
import {buildAppviewClient} from '../clients'

/*
 * Capture the options handed to the lex client factory. The route decision is
 * the unit under test, not the client the factory returns.
 */
jest.mock('#/lib/lexClient', () => ({
  createLexClient: jest.fn((_agent: unknown, opts?: unknown) => ({opts})),
}))

const agent = {did: undefined, fetchHandler: jest.fn()} as unknown as Agent

const BLACKSKY_APPVIEW = resolveAppViewForService('https://northsky.social')

function serviceOf(client: unknown): string | undefined {
  return (client as {opts?: {service?: string}}).opts?.service
}

/*
 * northsky: `buildAppviewClient` is where the resolved appview route becomes
 * the `atproto-proxy` target. Host resolution itself is covered by
 * `src/brand/__tests__/appview.test.ts`.
 */
describe('buildAppviewClient', () => {
  it('proxies to the routed appview', () => {
    const client = buildAppviewClient(agent, BLACKSKY_APPVIEW)
    expect(serviceOf(client)).toBe(`${BLACKSKY_APPVIEW.did}#bsky_appview`)
  })

  it('proxies to the fallback appview when routed there', () => {
    const client = buildAppviewClient(agent, FALLBACK_APPVIEW)
    expect(serviceOf(client)).toBe(`${FALLBACK_APPVIEW.did}#bsky_appview`)
  })

  it('lets the E2E override win over the routed appview', () => {
    BLUESKY_PROXY_HEADER.set('did:plc:e2etest#bsky_appview')
    try {
      const client = buildAppviewClient(agent, BLACKSKY_APPVIEW)
      expect(serviceOf(client)).toBe('did:plc:e2etest#bsky_appview')
    } finally {
      BLUESKY_PROXY_HEADER.override = undefined
    }
  })
})
