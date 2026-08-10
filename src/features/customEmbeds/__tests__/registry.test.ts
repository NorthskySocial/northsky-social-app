import {type AppBskyEmbedExternal} from '@atproto/api'

// The cards pull in ALF and native modules that a unit test cannot boot. Only
// the handler's `match` matters here.
jest.mock('../tangledString/TangledStringEmbed', () => ({
  TangledStringEmbed: () => null,
}))
jest.mock('../tangledString/TangledStringPreview', () => ({
  TangledStringPreview: () => null,
}))

import {matchCustomEmbed} from '../registry'
import {tangledStringHandler} from '../tangledString'

function external(uri: string): AppBskyEmbedExternal.ViewExternal {
  return {uri, title: 'title', description: 'description'}
}

describe('matchCustomEmbed', () => {
  it('routes a tangled string link to the tangled handler', () => {
    expect(
      matchCustomEmbed(external('https://tangled.org/strings/a.test/rkey')),
    ).toBe(tangledStringHandler)
  })

  it('returns null for an unrelated link so it falls through to ExternalEmbed', () => {
    expect(matchCustomEmbed(external('https://example.com/post'))).toBeNull()
  })

  it('returns null for a non-string tangled page', () => {
    expect(
      matchCustomEmbed(external('https://tangled.org/repos/a.test/thing')),
    ).toBeNull()
  })

  it('returns null for a tangled string URL with a trailing path segment', () => {
    expect(
      matchCustomEmbed(external('https://tangled.org/strings/a.test/rkey/raw')),
    ).toBeNull()
  })
})
