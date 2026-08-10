import {describe, expect, it} from '@jest/globals'

import {isTangledStringUrl, parseTangledString} from './detect'

describe('parseTangledString', () => {
  it('parses a tangled.org string URL', () => {
    expect(
      parseTangledString('https://tangled.org/strings/kandake.africa/3moimoh'),
    ).toEqual({actor: 'kandake.africa', rkey: '3moimoh'})
  })

  it('parses the tangled.sh host too', () => {
    expect(
      parseTangledString('https://tangled.sh/strings/alice.test/abc123'),
    ).toEqual({actor: 'alice.test', rkey: 'abc123'})
  })

  it('keeps a DID actor intact despite its colons', () => {
    expect(
      parseTangledString('https://tangled.org/strings/did:plc:abc123/xyz'),
    ).toEqual({actor: 'did:plc:abc123', rkey: 'xyz'})
  })

  it('ignores query strings and fragments in the rkey', () => {
    expect(
      parseTangledString('https://tangled.org/strings/a.test/rkey?x=1#frag'),
    ).toEqual({actor: 'a.test', rkey: 'rkey'})
  })

  it('tolerates a trailing slash', () => {
    expect(
      parseTangledString('https://tangled.org/strings/a.test/rkey/'),
    ).toEqual({actor: 'a.test', rkey: 'rkey'})
  })

  it('returns null when the rkey is not the last path segment', () => {
    expect(
      parseTangledString('https://tangled.org/strings/a.test/rkey/extra'),
    ).toBeNull()
    expect(
      parseTangledString('https://tangled.org/strings/a.test/rkey/raw?x=1'),
    ).toBeNull()
  })

  it('returns null for a malformed percent escape in the actor', () => {
    expect(
      parseTangledString('https://tangled.org/strings/a%ZZ/rkey'),
    ).toBeNull()
  })

  it('is case insensitive on the host', () => {
    expect(
      parseTangledString('HTTPS://Tangled.ORG/strings/a.test/rkey'),
    ).not.toBeNull()
  })

  it('returns null for other tangled paths', () => {
    expect(
      parseTangledString('https://tangled.org/repos/alice.test/thing'),
    ).toBeNull()
    expect(parseTangledString('https://tangled.org/strings/alice.test')).toBe(
      null,
    )
  })

  it('returns null for unrelated URLs', () => {
    expect(parseTangledString('https://example.com/strings/a/b')).toBeNull()
    expect(parseTangledString('not a url')).toBeNull()
  })

  it('does not match a lookalike host', () => {
    expect(
      parseTangledString('https://nottangled.org/strings/a.test/rkey'),
    ).toBeNull()
  })
})

describe('isTangledStringUrl', () => {
  it('reports whether a URL is a tangled string', () => {
    expect(isTangledStringUrl('https://tangled.org/strings/a.test/rkey')).toBe(
      true,
    )
    expect(isTangledStringUrl('https://example.com')).toBe(false)
  })
})
