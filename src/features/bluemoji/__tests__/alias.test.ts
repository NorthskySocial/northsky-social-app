import {expect, it as test} from '@jest/globals'

import {
  aliasToRkey,
  normalizeAlias,
  punycodeEncode,
  rkeyToAlias,
} from '../alias'

test('ASCII aliases pass through unchanged', () => {
  expect(aliasToRkey('blobcat')).toBe('blobcat')
  expect(aliasToRkey(':blobcat:')).toBe('blobcat')
  expect(aliasToRkey(':Blob_Cat.v2:')).toBe('blob_cat.v2')
})

test('matches known IDN Punycode vectors', () => {
  expect(aliasToRkey('münchen')).toBe('xn--mnchen-3ya')
  expect(aliasToRkey('MÜNCHEN')).toBe('xn--mnchen-3ya')
  expect(aliasToRkey('日本語')).toBe('xn--wgv71a119e')
  expect(aliasToRkey('bücher')).toBe('xn--bcher-kva')
  expect(punycodeEncode('münchen')).toBe('mnchen-3ya')
})

test('round-trips Unicode aliases including emoji sequences', () => {
  for (const alias of ['🦋', '💙🦋', 'ब्लॉब-कैट', '한국어', '🏳️‍🌈', 'éxämple']) {
    const rkey = aliasToRkey(alias)
    expect(rkey).toMatch(/^[A-Za-z0-9._:~-]{1,512}$/)
    expect(rkeyToAlias(rkey)).toBe(normalizeAlias(alias))
  }
})

test('NFC canonicalisation: composed and decomposed forms collide', () => {
  const composed = 'café' // café, U+00E9
  const decomposed = 'café' // café, e + combining acute
  expect(aliasToRkey(composed)).toBe(aliasToRkey(decomposed))
})

test('rejects invalid aliases', () => {
  expect(() => aliasToRkey('')).toThrow(/empty/)
  expect(() => aliasToRkey('::')).toThrow(/empty/)
  expect(() => aliasToRkey('has space')).toThrow(/whitespace/)
  expect(() => aliasToRkey('a:b')).toThrow(/':'/)
  expect(() => aliasToRkey('xn--fake')).toThrow(/third and fourth/)
  expect(() => aliasToRkey('ab--cd')).toThrow(/third and fourth/)
  expect(() => aliasToRkey('bad‮char')).toThrow(/bidirectional/)
  expect(() => aliasToRkey('-leading')).toThrow(/ASCII aliases/)
  expect(() => aliasToRkey('trailing.')).toThrow(/ASCII aliases/)
  expect(() => aliasToRkey('x'.repeat(65))).toThrow(/too long/)
})

test('rkeyToAlias passes plain rkeys through', () => {
  expect(rkeyToAlias('blobcat')).toBe('blobcat')
  expect(rkeyToAlias('blob_cat.v2')).toBe('blob_cat.v2')
})
