import {describe, expect, it} from '@jest/globals'

import {BRAND as EMBED_BRAND} from '../bskyembed/src/brand'
import {BRAND} from '../src/brand/config'

/*
 * northsky: bskyembed is a separate pnpm workspace and cannot import
 * `#/brand`, so it keeps a hand-copied BRAND object. This test fails
 * when the copies drift apart.
 */
describe('bskyembed brand constants', () => {
  it('match src/brand/config.ts', () => {
    expect(EMBED_BRAND.appName).toEqual(BRAND.appName)
    expect(EMBED_BRAND.baseUrl).toEqual(BRAND.baseUrl)
    expect(EMBED_BRAND.aboutUrl).toEqual(BRAND.aboutUrl)
    expect(EMBED_BRAND.embedServiceUrl).toEqual(BRAND.embedServiceUrl)
    expect(EMBED_BRAND.publicAppViewUrl).toEqual(BRAND.publicAppViewUrl)
  })
})
