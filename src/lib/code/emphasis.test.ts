import {describe, expect, it} from '@jest/globals'

import {findEmphasis} from './emphasis'

/** Renders matches as `[text, style]` pairs for readable assertions. */
function matches(text: string, skip: {start: number; end: number}[] = []) {
  return findEmphasis(text, skip).spans.map(s => [
    text.slice(s.start, s.end),
    s.style,
  ])
}

/** Applies the hidden ranges, i.e. what the reader actually sees. */
function visible(text: string) {
  const {hidden} = findEmphasis(text)
  let out = ''
  let last = 0
  for (const h of [...hidden].sort((a, b) => a.start - b.start)) {
    out += text.slice(last, h.start)
    last = h.end
  }
  return out + text.slice(last)
}

describe('findEmphasis', () => {
  it('finds italic', () => {
    expect(matches('an *emphasis* here')).toEqual([
      ['emphasis', {italic: true}],
    ])
  })

  it('finds bold', () => {
    expect(matches('a **strong** word')).toEqual([['strong', {bold: true}]])
  })

  it('finds strikethrough', () => {
    expect(matches('a ~~gone~~ word')).toEqual([['gone', {strike: true}]])
  })

  it('finds underscore emphasis', () => {
    expect(matches('an _emphasis_ here')).toEqual([
      ['emphasis', {italic: true}],
    ])
    expect(matches('a __strong__ word')).toEqual([['strong', {bold: true}]])
  })

  it('strips the delimiters from the rendered text', () => {
    expect(visible('a **strong** word')).toBe('a strong word')
    expect(visible('an *emphasis* here')).toBe('an emphasis here')
    expect(visible('a ~~gone~~ word')).toBe('a gone word')
  })

  it('nests emphasis inside strong', () => {
    expect(matches('**bold *italic* end**')).toEqual([
      ['italic', {italic: true}],
      ['bold *italic* end', {bold: true}],
    ])
  })

  it('handles a trailing run that closes both', () => {
    expect(matches('**bold *italic***')).toEqual([
      ['italic', {italic: true}],
      ['bold *italic*', {bold: true}],
    ])
  })

  describe('false positives stay literal', () => {
    it('leaves snake_case alone', () => {
      expect(matches('call snake_case_name now')).toEqual([])
      expect(visible('call snake_case_name now')).toBe(
        'call snake_case_name now',
      )
    })

    it('leaves spaced asterisks alone', () => {
      expect(matches('2 * 3 * 4')).toEqual([])
    })

    it('leaves a bullet-style asterisk alone', () => {
      expect(matches('* list item')).toEqual([])
    })

    it('leaves a lone double asterisk alone', () => {
      expect(matches('a ** b')).toEqual([])
    })

    it('leaves an unmatched delimiter alone', () => {
      expect(matches('an *unclosed run')).toEqual([])
    })

    it('treats a single tilde as literal', () => {
      expect(matches('about ~5 items')).toEqual([])
      expect(matches('a ~no~ strike')).toEqual([])
    })
  })

  it('ignores delimiters inside skipped (code) ranges', () => {
    // `a * b * c` occupying the whole string: no emphasis should be found.
    const text = 'x `a * b * c` y'
    const skip = [{start: 2, end: 13}]
    expect(matches(text, skip)).toEqual([])
  })

  it('still matches emphasis outside a skipped range', () => {
    const text = '`a * b` and *real* emphasis'
    const skip = [{start: 0, end: 7}]
    expect(matches(text, skip)).toEqual([['real', {italic: true}]])
  })

  it('returns nothing for text with no delimiters', () => {
    expect(matches('plain text here')).toEqual([])
  })
})
