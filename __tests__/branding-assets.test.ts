import {describe, expect, it} from '@jest/globals'
import {readFileSync} from 'fs'
import {resolve} from 'path'

const read = (path: string) =>
  readFileSync(resolve(__dirname, '..', path), 'utf8')

describe('owned Northsky artwork', () => {
  const widgetAsset =
    'modules/TrendingTopicsWidget/ios/WidgetAssets.xcassets/BlueskyButterfly.imageset/butterfly.svg'
  const wordmarkAsset = 'bskyembed/assets/logo_full_name.svg'

  it('uses the approved logomark in the existing widget asset slot', () => {
    expect(read(widgetAsset)).toBe(read('bskyembed/assets/logo.svg'))
  })

  it('uses the approved Northsky wordmark paths in the embed asset slot', () => {
    const paths = (source: string) =>
      [...source.matchAll(/\bd="([^"]+)"/g)].map(match => match[1])
    expect(paths(read(wordmarkAsset))).toEqual(
      paths(read('src/brand/assets/Logotype.tsx')),
    )
    expect(paths(read(wordmarkAsset))).toHaveLength(8)
    expect(read('bskyembed/src/components/post.tsx')).toContain(
      "import logo from '../../assets/logo_full_name.svg'",
    )
  })

  it('protects both restored asset slots during upstream merges', () => {
    const owned = JSON.parse(read('scripts/owned-assets.json')) as {
      files: string[]
    }
    expect(owned.files).toEqual(
      expect.arrayContaining([widgetAsset, wordmarkAsset]),
    )
  })
})

describe('embed brand routing', () => {
  it('uses the brand host while retaining the escaped compatibility snippet', () => {
    const landing = read('bskyembed/src/screens/landing.tsx')
    expect(landing).toContain('`${BRAND.baseUrl}${path}?ref_src=embed`')
    expect(landing).toContain('escapeHtml(profileHref)')
    expect(landing).toContain('escapeHtml(href)')
    expect(landing).toContain('class="bluesky-embed" data-bluesky-uri=')
  })

  it('uses the configured OG service for starter pack cards', () => {
    expect(read('bskyembed/src/components/embed.tsx')).toContain(
      '`${BRAND.ogcardServiceUrl}/start/${starterPack.creator.did}/${rkey}`',
    )
  })
})
