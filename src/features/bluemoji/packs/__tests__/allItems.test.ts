import {afterEach, describe, expect, it, jest} from '@jest/globals'

import {getAllPackItems} from '../../api'
import {suggestFreeAlias} from '../suggest'

const realFetch = global.fetch
afterEach(() => {
  global.fetch = realFetch
})

const page = (n: number, cursor?: string) => ({
  pack: {uri: 'at://p/1'},
  items: Array.from({length: n}, (_, i) => ({
    uri: `at://m/${cursor ?? 'first'}-${i}`,
    subject: {uri: `at://i/${cursor ?? 'first'}-${i}`, name: ':x:'},
  })),
  ...(cursor === undefined
    ? {cursor: 'c2'}
    : cursor === 'c2'
      ? {cursor: 'c3'}
      : {}),
})

describe('getAllPackItems', () => {
  it('reads every page, not just the first', async () => {
    const seen: (string | null)[] = []
    global.fetch = jest.fn((url: string) => {
      const cursor = new URL(url).searchParams.get('cursor')
      seen.push(cursor)
      const body = page(2, cursor ?? undefined)
      return Promise.resolve(new Response(JSON.stringify(body)))
    }) as never
    const {items, truncated} = await getAllPackItems('at://p/1')
    expect(seen).toEqual([null, 'c2', 'c3'])
    expect(items).toHaveLength(6)
    expect(truncated).toBe(false)
  })

  it('stops, and says so, if the cursor never ends', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({...page(1), cursor: 'again'})),
      ),
    )
    const {truncated, items} = await getAllPackItems('at://p/1')
    expect(truncated).toBe(true)
    expect(items.length).toBeGreaterThan(0)
  })

  it('returns nothing for a pack the AppView does not know', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response('{}', {status: 404})),
    )
    expect(await getAllPackItems('at://p/none')).toEqual({
      items: [],
      truncated: false,
    })
  })
})

describe('suggestFreeAlias', () => {
  it('keeps a free name and suffixes a taken one', () => {
    expect(suggestFreeAlias(':cat:', new Set())).toBe('cat')
    expect(suggestFreeAlias(':cat:', new Set(['cat']))).toBe('cat_2')
    expect(suggestFreeAlias(':cat:', new Set(['cat', 'cat_2']))).toBe('cat_3')
  })
})
