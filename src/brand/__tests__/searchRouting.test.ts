import {type AppView} from '../appview'
import {searchProxyOpts} from '../searchRouting'

const APPVIEW: AppView = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
}

describe('searchProxyOpts', () => {
  it('pins search to the configured appview', () => {
    expect(
      searchProxyOpts({...APPVIEW, searchProxyDid: 'did:web:api.bsky.app'}),
    ).toEqual({headers: {'atproto-proxy': 'did:web:api.bsky.app#bsky_appview'}})
  })

  /*
   * An unpinned appview must not set the header at all, so the request keeps
   * following the one the agent already carries.
   */
  it('returns no options when the appview serves search itself', () => {
    expect(searchProxyOpts(APPVIEW)).toEqual({})
  })
})
