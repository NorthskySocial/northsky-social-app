import {bskyTitle} from '#/lib/strings/headings'
import {BRAND} from '#/brand/config'

describe('bskyTitle', () => {
  it('suffixes the page with the brand name', () => {
    expect(bskyTitle('Home')).toBe(`Home — ${BRAND.appName}`)
  })

  it('prefixes the unread count when provided', () => {
    expect(bskyTitle('Home', '3')).toBe(`(3) Home — ${BRAND.appName}`)
  })
})
