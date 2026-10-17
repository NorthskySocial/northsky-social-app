import {RichText} from '@bsky/sdk/richtext'
import {describe, expect, it, jest} from '@jest/globals'

import {
  attachBluemojiFacets,
  facetFeatureForItem,
  findAliases,
  getBluemojiFeature,
} from '../facets'
import {type BluemojiItemView} from '../types'

const DID = 'did:plc:abc123'

function item(name: string, over: Partial<BluemojiItemView> = {}) {
  return {
    uri: `at://${DID}/blue.moji.collection.item/${name.replace(/:/g, '')}`,
    did: DID,
    name,
    alt: 'a cat',
    formats: {png_128: 'bafkreipng', apng_128: true},
    ...over,
  } satisfies BluemojiItemView
}

function build(text: string) {
  const rt = new RichText({text})
  rt.detectFacetsWithoutResolution()
  return rt
}

describe('findAliases', () => {
  it('finds colon-wrapped aliases', () => {
    expect(findAliases('hi :blobcat: and :blob_dog:').map(m => m.name)).toEqual(
      [':blobcat:', ':blob_dog:'],
    )
  })

  it('ignores clock times and lone colons', () => {
    expect(findAliases('at 3:30:45 or note: this')).toEqual([])
  })

  it('accepts one-character aliases', () => {
    expect(findAliases('a :a: and :🦋:').map(m => m.name)).toEqual([
      ':a:',
      ':🦋:',
    ])
  })

  it('accepts internationalised aliases', () => {
    expect(findAliases(':日本語:').map(m => m.name)).toEqual([':日本語:'])
  })
})

describe('facetFeatureForItem', () => {
  it('copies only string CIDs from the verified item', () => {
    const f = facetFeatureForItem(item(':blobcat:'))
    expect(f).toMatchObject({
      $type: 'blue.moji.richtext.facet',
      did: DID,
      name: ':blobcat:',
      alt: 'a cat',
      formats: {
        $type: 'blue.moji.richtext.facet#formats_v1',
        png_128: 'bafkreipng',
      },
    })
    // deprecated v0 booleans have no CID and cannot be rendered from a facet
    expect(f?.formats).not.toHaveProperty('apng_128')
  })

  it('unwraps blob refs, which is what the AppView actually returns', () => {
    const f = facetFeatureForItem(
      item(':blobcat:', {
        formats: {
          png_128: {ref: {$link: 'bafkreiblob'}},
          gif_128: {$link: 'bafkreigif'},
        },
      }),
    )
    expect(f?.formats).toMatchObject({
      png_128: 'bafkreiblob',
      gif_128: 'bafkreigif',
    })
  })

  it('returns undefined when there is nothing renderable', () => {
    expect(
      facetFeatureForItem(item(':x:', {formats: {apng_128: true}})),
    ).toBeUndefined()
  })

  it('carries adultOnly from the source record', () => {
    expect(
      facetFeatureForItem(item(':nsfw:', {adultOnly: true}))?.adultOnly,
    ).toBe(true)
  })
})

describe('attachBluemojiFacets', () => {
  it('adds a facet over the alias, with UTF-8 byte offsets', async () => {
    // the leading emoji is 4 UTF-8 bytes but 2 UTF-16 units
    const rt = build('🦋 :blobcat: hi')
    await attachBluemojiFacets(rt, n => Promise.resolve(item(n)))
    expect(rt.facets).toHaveLength(1)
    expect(rt.facets![0].index).toEqual({byteStart: 5, byteEnd: 14})
    const segs = [...rt.segments()]
    expect(segs.map(s => s.text)).toEqual(['🦋 ', ':blobcat:', ' hi'])
    expect(getBluemojiFeature(segs[1].facet)?.did).toBe(DID)
  })

  it('leaves unknown aliases as plain text', async () => {
    const rt = build('hello :nope:')
    await attachBluemojiFacets(rt, () => Promise.resolve(null))
    expect(rt.facets).toBeUndefined()
  })

  it('does not block the post when the lookup fails', async () => {
    const rt = build('hello :blobcat:')
    await attachBluemojiFacets(rt, () => Promise.reject(new Error('network')))
    expect(rt.facets).toBeUndefined()
  })

  it('does not facet an alias inside a link', async () => {
    const rt = build('see https://example.com/a:b:c ok')
    const before = rt.facets
    const resolve = jest.fn((n: string) => Promise.resolve(item(n)))
    await attachBluemojiFacets(rt, resolve)
    expect(rt.facets).toEqual(before)
  })

  it('looks each alias up once and keeps facets ordered', async () => {
    const rt = build('@alice.test :a1: https://example.com :a1: :b2:')
    const resolve = jest.fn((n: string) => Promise.resolve(item(n)))
    await attachBluemojiFacets(rt, resolve)
    expect(resolve).toHaveBeenCalledTimes(2)
    const starts = rt.facets!.map(f => f.index.byteStart)
    expect(starts).toEqual([...starts].sort((x, y) => x - y))
    expect(rt.facets!.filter(f => getBluemojiFeature(f))).toHaveLength(3)
  })

  it('resolves case variants to one canonical lookup', async () => {
    const rt = build(':Cat: :cat:')
    const resolve = jest.fn((n: string) => Promise.resolve(item(n)))
    await attachBluemojiFacets(rt, resolve)
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(resolve).toHaveBeenCalledWith(':cat:')
  })
})
