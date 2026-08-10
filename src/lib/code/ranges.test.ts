import {RichText} from '@atproto/api'
import {describe, expect, it} from '@jest/globals'

import {hasFormatting, type RichTextItem, segmentsWithCode} from './ranges'

function build(text: string) {
  const rt = new RichText({text})
  rt.detectFacetsWithoutResolution()
  return segmentsWithCode(rt)
}

/** Compact rendering of the item stream for readable assertions. */
function describeItems(items: RichTextItem[]): string[] {
  return items.map(item => {
    if (item.kind === 'code') {
      const {token} = item
      const lang = token.type === 'fence' ? token.lang : undefined
      return `${token.type}(${lang ?? '-'}):${token.value}`
    }
    if (item.kind === 'segment') {
      const style = item.style ? `+${Object.keys(item.style).join(',')}` : ''
      return `facet${style}:${item.segment.text}`
    }
    const style = item.style ? `+${Object.keys(item.style).join(',')}` : ''
    return `text${style}:${item.text}`
  })
}

describe('hasFormatting', () => {
  it('is false for plain text', () => {
    expect(hasFormatting('just a normal post')).toBe(false)
  })

  it('is true for code or emphasis markers', () => {
    expect(hasFormatting('a `code` span')).toBe(true)
    expect(hasFormatting('a **bold** word')).toBe(true)
  })
})

describe('segmentsWithCode', () => {
  it('passes plain text straight through', () => {
    expect(describeItems(build('hello world'))).toEqual(['text:hello world'])
  })

  it('splits inline code out of surrounding text', () => {
    expect(describeItems(build('run `npm test` now'))).toEqual([
      'text:run ',
      'inline(-):npm test',
      'text: now',
    ])
  })

  it('keeps a link as a single facet segment', () => {
    expect(describeItems(build('see https://example.com ok'))).toEqual([
      'text:see ',
      'facet:https://example.com',
      'text: ok',
    ])
  })

  /**
   * The regression this module exists for. Tokenizing per facet-segment splits
   * the fence markers away from the body, so the whole thing renders literally.
   */
  it('keeps a fenced block containing a URL intact', () => {
    const items = build('```sh\ncurl https://example.com\n```')
    expect(describeItems(items)).toEqual(['fence(sh):curl https://example.com'])
  })

  it('keeps a fenced block containing a mention intact', () => {
    const items = build('```\nping @alice.test\n```')
    expect(describeItems(items)).toEqual(['fence(-):ping @alice.test'])
  })

  it('drops a link facet that falls inside inline code', () => {
    const items = build('use `https://example.com` here')
    expect(describeItems(items)).toEqual([
      'text:use ',
      'inline(-):https://example.com',
      'text: here',
    ])
  })

  it('handles inline code adjacent to a link', () => {
    expect(describeItems(build('`npm i` https://example.com'))).toEqual([
      'inline(-):npm i',
      'text: ',
      'facet:https://example.com',
    ])
  })

  describe('emphasis', () => {
    it('styles plain text and removes the delimiters', () => {
      expect(describeItems(build('a **strong** word'))).toEqual([
        'text:a ',
        'text+bold:strong',
        'text: word',
      ])
    })

    it('applies emphasis to a whole link rather than splitting it', () => {
      expect(describeItems(build('**see https://example.com now**'))).toEqual([
        'text+bold:see ',
        'facet+bold:https://example.com',
        'text+bold: now',
      ])
    })

    /**
     * atproto's link detection absorbs a delimiter that directly follows a URL
     * into the URL itself, so the record's own facet is `...example.com**`.
     * The closer is then inside a facet and cannot pair. Rendering the text
     * literally is the honest outcome - the stored link is what it is, and no
     * renderer can repair it.
     */
    it('leaves a delimiter absorbed into a URL literal', () => {
      expect(describeItems(build('**see https://example.com**'))).toEqual([
        'text:**see ',
        'facet:https://example.com**',
      ])
    })

    it('does not italicise inside a URL with underscores', () => {
      const items = build('read https://example.com/a_b_c today')
      expect(describeItems(items)).toEqual([
        'text:read ',
        'facet:https://example.com/a_b_c',
        'text: today',
      ])
    })

    it('leaves emphasis markers inside code literal', () => {
      expect(describeItems(build('run `a * b * c` now'))).toEqual([
        'text:run ',
        'inline(-):a * b * c',
        'text: now',
      ])
    })

    it('combines code and emphasis in one post', () => {
      expect(describeItems(build('**bold** then `code`'))).toEqual([
        'text+bold:bold',
        'text: then ',
        'inline(-):code',
      ])
    })

    it('keeps snake_case literal', () => {
      expect(describeItems(build('the snake_case_name value'))).toEqual([
        'text:the snake_case_name value',
      ])
    })
  })

  it('handles a fence surrounded by prose', () => {
    expect(
      describeItems(build('before\n```ts\nconst x = 1\n```\nafter')),
    ).toEqual(['text:before\n', 'fence(ts):const x = 1', 'text:\nafter'])
  })
})
