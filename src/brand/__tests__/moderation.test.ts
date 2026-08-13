import {BSKY_LABELER_DID} from '@atproto/api'

import {BRAND} from '../config'
import {getHostModerationInfo, getHostModServiceHeaders} from '../moderation'

const NORTHSKY_MOD_DID = 'did:plc:p2cxrw3ank4dzs55mpm6ohq4'
const BLACKSKY_MOD_DID = 'did:plc:d2mkddsbmnrgr3domzg5qexf'

describe('getHostModerationInfo', () => {
  it('resolves northsky.social to the Northsky operator', () => {
    const result = getHostModerationInfo('https://northsky.social')
    expect(result.name).toBe('Northsky Social')
    expect(result.tosUrl).toBe(
      'https://northskysocial.com/posts/terms-of-service',
    )
    expect(result.modServiceDid).toBe(NORTHSKY_MOD_DID)
  })

  /*
   * Drift guard: the map is keyed on hand-written hostnames, so a change to
   * the brand's PDS URL must not silently stop matching. This is the check
   * that would have caught the dead `blacksky.social` key.
   */
  it('stays in sync with BRAND.pdsServiceUrl', () => {
    expect(getHostModerationInfo(BRAND.pdsServiceUrl).name).toBe(
      'Northsky Social',
    )
  })

  it('resolves blacksky.app to the Blacksky operator', () => {
    const result = getHostModerationInfo('https://blacksky.app/')
    expect(result.name).toBe('Blacksky Algorithms')
    expect(result.tosUrl).toBe('https://www.blackskyweb.xyz/about/support/tos')
    expect(result.modServiceDid).toBe(BLACKSKY_MOD_DID)
  })

  it('resolves bsky.social to the Bluesky operator', () => {
    const result = getHostModerationInfo('https://bsky.social')
    expect(result.name).toBe('Bluesky Social')
    expect(result.tosUrl).toBe('https://bsky.social/about/support/tos')
    expect(result.modServiceDid).toBe(BSKY_LABELER_DID)
  })

  it('falls back to Bluesky for unknown hosts', () => {
    const result = getHostModerationInfo('https://pds.example.com')
    expect(result.name).toBe('Bluesky Social')
    expect(result.modServiceDid).toBe(BSKY_LABELER_DID)
  })

  it('does not match lookalike subdomains of known hosts', () => {
    for (const url of [
      'https://northsky.social.attacker.com',
      'https://blacksky.app.attacker.com',
      'https://pds.northsky.social',
    ]) {
      const result = getHostModerationInfo(url)
      expect(result.name).toBe('Bluesky Social')
      expect(result.modServiceDid).toBe(BSKY_LABELER_DID)
    }
  })

  it('falls back for prototype-key hostnames instead of leaking Object.prototype', () => {
    for (const url of [
      'https://__proto__/',
      'https://constructor/',
      'https://hasownproperty/',
    ]) {
      const result = getHostModerationInfo(url)
      expect(result.name).toBe('Bluesky Social')
      expect(result.tosUrl).toBe('https://bsky.social/about/support/tos')
      expect(result.modServiceDid).toBe(BSKY_LABELER_DID)
    }
  })

  it('falls back for missing or unparseable service URLs', () => {
    expect(getHostModerationInfo(undefined).name).toBe('Bluesky Social')
    expect(getHostModerationInfo('not a url').name).toBe('Bluesky Social')
  })

  /*
   * The port is dropped by `hostname`, but the case is not: React Native's URL
   * polyfill preserves it where Node and browsers lower-case it, so the lookup
   * normalizes explicitly. This test fails on native without that.
   */
  it('normalizes case and port', () => {
    for (const url of [
      'https://Northsky.Social:443/',
      'https://NORTHSKY.SOCIAL/',
      'https://northsky.social:443/',
    ]) {
      expect(getHostModerationInfo(url).name).toBe('Northsky Social')
    }
  })
})

describe('getHostModServiceHeaders', () => {
  it('routes northsky.social appeals to the Northsky mod service', () => {
    expect(getHostModServiceHeaders('https://northsky.social')).toEqual({
      'atproto-proxy': `${NORTHSKY_MOD_DID}#atproto_labeler`,
    })
  })

  it('routes blacksky.app appeals to the Blacksky mod service', () => {
    expect(getHostModServiceHeaders('https://blacksky.app')).toEqual({
      'atproto-proxy': `${BLACKSKY_MOD_DID}#atproto_labeler`,
    })
  })

  /*
   * Regression proof for the fallback path: a host the map cannot resolve must
   * keep producing the exact header the screen sent before appeals became
   * host-aware.
   */
  it.each([
    ['an unknown host', 'https://pds.example.com'],
    ['a missing service URL', undefined],
  ])('falls back to the Bluesky mod service for %s', (_name, serviceUrl) => {
    expect(getHostModServiceHeaders(serviceUrl)).toEqual({
      'atproto-proxy': `${BSKY_LABELER_DID}#atproto_labeler`,
    })
  })
})
