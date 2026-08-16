import {FALLBACK_APPVIEW, resolveAppViewForService} from '../appview'
import {BRAND} from '../config'

const BLACKSKY_APPVIEW_DID = 'did:web:api.blacksky.community'

describe('resolveAppViewForService', () => {
  it('routes northsky.social to the Blacksky appview', () => {
    const result = resolveAppViewForService('https://northsky.social')
    expect(result.url).toBe('https://api.blacksky.community')
    expect(result.did).toBe(BLACKSKY_APPVIEW_DID)
  })

  /*
   * Drift guard: the map is keyed on hand-written hostnames, so a change to
   * the brand's PDS URL must not silently stop matching.
   */
  it('stays in sync with BRAND.pdsServiceUrl', () => {
    expect(resolveAppViewForService(BRAND.pdsServiceUrl).did).toBe(
      BLACKSKY_APPVIEW_DID,
    )
  })

  /*
   * The logged-out public agent uses BRAND.publicAppViewUrl as its service,
   * so that host must resolve to the same appview it talks to.
   */
  it('stays in sync with BRAND.publicAppViewUrl', () => {
    expect(resolveAppViewForService(BRAND.publicAppViewUrl).did).toBe(
      BLACKSKY_APPVIEW_DID,
    )
  })

  it('routes the Blacksky login hosts to the Blacksky appview', () => {
    for (const url of ['https://blacksky.community', 'https://blacksky.app/']) {
      expect(resolveAppViewForService(url).did).toBe(BLACKSKY_APPVIEW_DID)
    }
  })

  it('matches hostnames case-insensitively', () => {
    const result = resolveAppViewForService('https://NorthSky.Social')
    expect(result.did).toBe(BLACKSKY_APPVIEW_DID)
  })

  it('falls back to Bluesky for unknown hosts', () => {
    expect(resolveAppViewForService('https://bsky.social')).toEqual(
      FALLBACK_APPVIEW,
    )
    expect(resolveAppViewForService('https://pds.example.com')).toEqual(
      FALLBACK_APPVIEW,
    )
  })

  it('falls back when the service URL is missing or unparseable', () => {
    expect(resolveAppViewForService(undefined)).toEqual(FALLBACK_APPVIEW)
    expect(resolveAppViewForService('not a url')).toEqual(FALLBACK_APPVIEW)
  })

  it('does not match lookalike subdomains of known hosts', () => {
    for (const url of [
      'https://northsky.social.attacker.com',
      'https://blacksky.app.attacker.com',
      'https://pds.northsky.social',
    ]) {
      expect(resolveAppViewForService(url)).toEqual(FALLBACK_APPVIEW)
    }
  })
})
