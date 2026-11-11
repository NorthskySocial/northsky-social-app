import {afterEach, describe, expect, it} from '@jest/globals'

import {shouldAutoFocusSearch} from '../searchFocus'

const g = globalThis as unknown as {window?: unknown}
const original = g.window

function withPointer(coarse: boolean | 'no-matchMedia') {
  g.window =
    coarse === 'no-matchMedia'
      ? {}
      : {
          matchMedia: (query: string) => ({
            matches: query === '(pointer: coarse)' ? coarse : false,
          }),
        }
}

describe('shouldAutoFocusSearch', () => {
  afterEach(() => {
    g.window = original
  })

  it('focuses the search with a mouse', () => {
    withPointer(false)
    expect(shouldAutoFocusSearch()).toBe(true)
  })

  it('leaves it unfocused on a touch device, so no keyboard pops up', () => {
    withPointer(true)
    expect(shouldAutoFocusSearch()).toBe(false)
  })

  it('keeps the old behaviour where it cannot tell', () => {
    withPointer('no-matchMedia')
    expect(shouldAutoFocusSearch()).toBe(true)
  })
})
