import {describe, expect, it} from '@jest/globals'

import {
  createBskyAppAbsoluteUrl,
  getChatInviteCodeFromUrl,
  isBskyAppUrl,
  isBskyPostUrl,
  isBskyStartUrl,
  isPossiblyAUrl,
  isTrustedUrl,
  linkRequiresWarning,
  splitApexDomain,
  toBskyAppUrl,
  toShareUrl,
} from '../../../src/lib/strings/url-helpers'

describe('linkRequiresWarning', () => {
  type Case = [string, string, boolean]

  const cases: Case[] = [
    ['http://example.com', 'http://example.com', false],
    ['http://example.com', 'example.com', false],
    ['http://example.com', 'example.com/page', false],
    ['http://example.com', '', true],
    ['http://example.com', 'other.com', true],
    ['http://example.com', 'http://other.com', true],
    ['http://example.com', 'some label', true],
    ['http://example.com', 'example.com more', true],
    ['http://example.com', 'http://example.co', true],
    ['http://example.co', 'http://example.com', true],
    ['http://example.com', 'example.co', true],
    ['http://example.co', 'example.com', true],
    ['http://site.pages.dev', 'http://site.page', true],
    ['http://site.page', 'http://site.pages.dev', true],
    ['http://site.pages.dev', 'site.page', true],
    ['http://site.page', 'site.pages.dev', true],
    ['http://site.pages.dev', 'http://site.pages', true],
    ['http://site.pages', 'http://site.pages.dev', true],
    ['http://site.pages.dev', 'site.pages', true],
    ['http://site.pages', 'site.pages.dev', true],
    ['http://bsky.app/profile/bob.test/post/3kbeuduu7m22v', 'my post', false],
    ['https://bsky.app/profile/bob.test/post/3kbeuduu7m22v', 'my post', false],
    ['http://bsky.app/', 'bluesky', false],
    ['https://bsky.app/', 'bluesky', false],
    [
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'https://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'http://bsky.app/',
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'https://bsky.app/',
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      false,
    ],
    [
      'http://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      'https://google.com',
      true,
    ],
    [
      'https://bsky.app/profile/bob.test/post/3kbeuduu7m22v',
      'https://google.com',
      true,
    ],
    ['http://bsky.app/', 'https://google.com', true],
    ['https://bsky.app/', 'https://google.com', true],

    // case insensitive
    ['https://Example.com', 'example.com', false],
    ['https://example.com', 'Example.com', false],

    // bad uri inputs, default to true
    ['', '', true],
    ['example.com', 'example.com', true],
    ['/profile', 'Username', false],
    ['#', 'Show More', false],
    ['https://docs.bsky.app', 'https://docs.bsky.app', false],
    ['https://bsky.app/compose/intent?text=test', 'Compose a post', false],
  ]

  it.each(cases)(
    'given input uri %p and text %p, returns %p',
    (uri, text, expected) => {
      const output = linkRequiresWarning(uri, text)
      expect(output).toEqual(expected)
    },
  )
})

describe('isPossiblyAUrl', () => {
  type Case = [string, boolean]
  const cases: Case[] = [
    ['', false],
    ['text', false],
    ['some text', false],
    ['some text', false],
    ['some domain.com', false],
    ['domain.com', true],
    [' domain.com', true],
    ['domain.com ', true],
    [' domain.com ', true],
    ['http://domain.com', true],
    [' http://domain.com', true],
    ['http://domain.com ', true],
    [' http://domain.com ', true],
    ['https://domain.com', true],
    [' https://domain.com', true],
    ['https://domain.com ', true],
    [' https://domain.com ', true],
    ['http://domain.com/foo', true],
    ['http://domain.com stuff', true],
  ]

  it.each(cases)('given input uri %p, returns %p', (str, expected) => {
    const output = isPossiblyAUrl(str)
    expect(output).toEqual(expected)
  })
})

describe('splitApexDomain', () => {
  type Case = [string, string, string]
  const cases: Case[] = [
    ['', '', ''],
    ['example.com', '', 'example.com'],
    ['foo.example.com', 'foo.', 'example.com'],
    ['foo.bar.example.com', 'foo.bar.', 'example.com'],
    ['example.co.uk', '', 'example.co.uk'],
    ['foo.example.co.uk', 'foo.', 'example.co.uk'],
    ['example.nonsense', '', 'example.nonsense'],
    ['foo.example.nonsense', '', 'foo.example.nonsense'],
    ['foo.bar.example.nonsense', '', 'foo.bar.example.nonsense'],
    ['example.com.example.com', 'example.com.', 'example.com'],
  ]

  it.each(cases)(
    'given input uri %p, returns %p,%p',
    (str, expected1, expected2) => {
      const output = splitApexDomain(str)
      expect(output[0]).toEqual(expected1)
      expect(output[1]).toEqual(expected2)
    },
  )
})

describe('isTrustedUrl', () => {
  const cases = [
    ['#', true],
    ['#profile', true],
    ['/', true],
    ['/profile', true],
    ['/profile/', true],
    ['/profile/bob.test', true],
    ['https://bsky.app', true],
    ['https://bsky.app/', true],
    ['https://bsky.app/profile/bob.test', true],
    ['https://www.bsky.app', true],
    ['https://www.bsky.app/', true],
    ['https://docs.bsky.app', true],
    ['https://bsky.social', true],
    ['https://bsky.social/blog', true],
    ['https://blueskyweb.xyz', true],
    ['https://blueskyweb.zendesk.com', true],
    ['http://bsky.app', true],
    ['http://bsky.social', true],
    ['http://blueskyweb.xyz', true],
    ['http://blueskyweb.zendesk.com', true],
    ['https://google.com', false],
    ['https://docs.google.com', false],
    ['https://google.com/#', false],
    ['https://blueskywebxzendesk.com', false],
    ['https://bsky.app.attacker.com', false],
    ['https://bsky.app.attacker.com/profile', false],
    ['https://northsky.app.attacker.com', false],
    ['https://bsky.app@attacker.com', false],
    ['https://bsky.appattacker.com', false],
    ['https://northsky.app', true],
    ['https://northsky.social/blog', true],
    ['https://northskysocial.com', true],
  ]

  it.each(cases)('given input uri %p, returns %p', (str, expected) => {
    const output = isTrustedUrl(str)
    expect(output).toEqual(expected)
  })
})

/* northsky: minting is brand-only, recognition accepts bsky.app and the brand host */
describe('brand URL minting', () => {
  it('toShareUrl prefixes relative paths with the brand host', () => {
    expect(toShareUrl('/profile/bob.test')).toEqual(
      'https://northsky.app/profile/bob.test',
    )
  })

  it('toShareUrl passes through absolute https URLs', () => {
    expect(toShareUrl('https://example.com/page')).toEqual(
      'https://example.com/page',
    )
  })

  it('toBskyAppUrl resolves relative paths against the brand host', () => {
    expect(toBskyAppUrl('/profile/bob.test')).toEqual(
      'https://northsky.app/profile/bob.test',
    )
  })

  it('createBskyAppAbsoluteUrl strips either app host', () => {
    expect(
      createBskyAppAbsoluteUrl('https://bsky.app/profile/bob.test'),
    ).toEqual('https://northsky.app/profile/bob.test')
    expect(
      createBskyAppAbsoluteUrl('https://northsky.app/profile/bob.test'),
    ).toEqual('https://northsky.app/profile/bob.test')
    expect(createBskyAppAbsoluteUrl('/profile/bob.test')).toEqual(
      'https://northsky.app/profile/bob.test',
    )
  })
})

describe('dual-host recognition', () => {
  type Case = [string, boolean]

  const appUrlCases: Case[] = [
    ['https://bsky.app/profile/bob.test', true],
    ['https://northsky.app/profile/bob.test', true],
    ['https://bsky.app/', true],
    ['https://northsky.app/', true],
    ['https://example.com/profile/bob.test', false],
    ['https://northsky.app.attacker.com/profile/bob.test', false],
    ['https://bsky.app.attacker.com/profile/bob.test', false],
  ]

  it.each(appUrlCases)('isBskyAppUrl(%p) returns %p', (url, expected) => {
    expect(isBskyAppUrl(url)).toEqual(expected)
  })

  const postUrlCases: Case[] = [
    ['https://bsky.app/profile/bob.test/post/3kbeuduu7m22v', true],
    ['https://northsky.app/profile/bob.test/post/3kbeuduu7m22v', true],
    ['https://example.com/profile/bob.test/post/3kbeuduu7m22v', false],
  ]

  it.each(postUrlCases)('isBskyPostUrl(%p) returns %p', (url, expected) => {
    expect(isBskyPostUrl(url)).toEqual(expected)
  })

  const startUrlCases: Case[] = [
    ['https://bsky.app/start/bob.test/3kbeuduu7m22v', true],
    ['https://northsky.app/start/bob.test/3kbeuduu7m22v', true],
    ['https://example.com/start/bob.test/3kbeuduu7m22v', false],
  ]

  it.each(startUrlCases)('isBskyStartUrl(%p) returns %p', (url, expected) => {
    expect(isBskyStartUrl(url)).toEqual(expected)
  })
})

describe('getChatInviteCodeFromUrl', () => {
  type Case = [string, string | undefined]

  const cases: Case[] = [
    ['https://bsky.app/chat/abcdefg', 'abcdefg'],
    ['https://bsky.app/chat/abcdefghij', 'abcdefghij'],
    // northsky: the brand host is recognized too
    ['https://northsky.app/chat/abcdefg', 'abcdefg'],
    ['https://northsky.app/chat/abcdefg?utm=foo', 'abcdefg'],
    // http is not recognized as a bsky.app url
    ['http://bsky.app/chat/abcdefg', undefined],
    ['https://bsky.app/chat/abcdefg?utm=foo', 'abcdefg'],
    ['https://bsky.app/chat/abcdefg#section', 'abcdefg'],
    ['/chat/abcdefg', 'abcdefg'],
    ['/chat/abcdefg?utm=foo', 'abcdefg'],
    ['/chat/abcdefg#section', 'abcdefg'],

    // too short
    ['https://bsky.app/chat/abcdef', undefined],
    ['/chat/abcdef', undefined],
    // too long
    ['https://bsky.app/chat/abcdefghijk', undefined],
    ['/chat/abcdefghijk', undefined],
    // invalid characters
    ['https://bsky.app/chat/abc-def', undefined],
    ['/chat/abc def', undefined],
    // trailing path
    ['https://bsky.app/chat/abcdefg/extra', undefined],
    ['/chat/abcdefg/extra', undefined],
    // wrong path
    ['https://bsky.app/profile/abcdefg', undefined],
    ['https://bsky.app/chat', undefined],
    // wrong host
    ['https://example.com/chat/abcdefg', undefined],
    // not a url, not a path
    ['chat/abcdefg', undefined],
    ['abcdefg', undefined],
    ['', undefined],
    // malformed url
    ['https://[invalid/chat/abcdefg', undefined],
  ]

  it.each(cases)('given input %p, returns %p', (input, expected) => {
    expect(getChatInviteCodeFromUrl(input)).toEqual(expected)
  })
})
