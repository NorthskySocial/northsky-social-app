import {describe, expect, it} from '@jest/globals'

import {buildAliasMap, searchItems} from '../editor/collectionIndex'
import {type BluemojiItemView} from '../types'

const item = (name: string, alt?: string): BluemojiItemView => ({
  uri: `at://did:plc:a/blue.moji.collection.item/${name}`,
  did: 'did:plc:a',
  name: `:${name}:`,
  alt,
  formats: {png_128: 'bafk'},
})

const items = [
  item('blob-cat', 'a round cat'),
  item('cat'),
  item('scatter'),
  item('dog', 'not a cat, a dog'),
]

describe('searchItems', () => {
  it('ranks prefix, then substring, then alt text matches', () => {
    expect(searchItems(items, 'cat', 10).map(i => i.name)).toEqual([
      ':cat:',
      ':blob-cat:',
      ':scatter:',
      ':dog:',
    ])
  })

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchItems(items, '  ', 10)).toEqual([])
    expect(searchItems(items, 'cat', 2)).toHaveLength(2)
  })

  it('is case-insensitive', () => {
    expect(searchItems(items, 'DOG', 5)[0].name).toBe(':dog:')
  })
})

describe('buildAliasMap', () => {
  it('keys by canonical alias', () => {
    const map = buildAliasMap([item('Blob-Cat')])
    expect(map.has('blob-cat')).toBe(true)
  })
})
