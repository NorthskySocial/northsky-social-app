import {type AppBskyGraphDefs} from '@atproto/api'
import {describe, expect, it} from '@jest/globals'

import {makeStarterPackLink} from '../../../src/lib/routes/links'

/* northsky: starter pack share links mint the brand host directly */
describe('makeStarterPackLink', () => {
  it('mints a brand link from a name and rkey', () => {
    expect(makeStarterPackLink('bob.test', '3kbeuduu7m22v')).toEqual(
      'https://northsky.app/start/bob.test/3kbeuduu7m22v',
    )
  })

  it('mints a brand link from a starter pack view', () => {
    const starterPack = {
      uri: 'at://did:plc:abc123/app.bsky.graph.starterpack/3kbeuduu7m22v',
      cid: 'bafyreib2rxk3rw6afbb56dgpqxjcpceqm2mn2ihqrzcqoqifni7q54bwbi',
      record: {},
      creator: {
        did: 'did:plc:abc123',
        handle: 'bob.test',
      },
      indexedAt: '2024-01-01T00:00:00.000Z',
    } as AppBskyGraphDefs.StarterPackViewBasic

    expect(makeStarterPackLink(starterPack)).toEqual(
      'https://northsky.app/start/bob.test/3kbeuduu7m22v',
    )
  })
})
