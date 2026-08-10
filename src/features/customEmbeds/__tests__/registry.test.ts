import {type AppBskyEmbedExternal} from '@atproto/api'

/*
 * The cards pull in ALF and native modules that a unit test cannot boot. Only
 * the handler's `match` matters here.
 */
jest.mock('../tangledString/TangledStringEmbed', () => ({
  TangledStringEmbed: () => null,
}))
jest.mock('../tangledString/TangledStringPreview', () => ({
  TangledStringPreview: () => null,
}))

import {matchCustomEmbed, matchCustomEmbedPreview} from '../registry'
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

describe('matchCustomEmbedPreview', () => {
  it('prefers a declared Preview over the full card', () => {
    const Preview = matchCustomEmbedPreview(
      external('https://tangled.org/strings/a.test/rkey'),
    )
    expect(Preview).toBe(tangledStringHandler.Preview)
    expect(Preview).not.toBe(tangledStringHandler.Component)
  })

  it('returns null for an unmatched link so the composer keeps its link card', () => {
    expect(
      matchCustomEmbedPreview(external('https://example.com/post')),
    ).toBeNull()
  })

  it('falls back to the full card for a handler with no Preview', () => {
    jest.isolateModules(() => {
      const Component = () => null
      jest.doMock('../tangledString', () => ({
        tangledStringHandler: {match: () => true, Component},
      }))
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const registry = require('../registry') as typeof import('../registry')
      expect(
        registry.matchCustomEmbedPreview(external('https://any.test')),
      ).toBe(Component)
    })
  })
})
