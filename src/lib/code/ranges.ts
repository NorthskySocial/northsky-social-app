/**
 * Resolves the three overlapping layers of post text - code, facets and
 * emphasis - into one ordered stream for the renderer.
 *
 * Precedence is the whole point: **code > facet > emphasis**.
 *
 * Upstream `RichText` walks `richText.segments()`, which splits the text at
 * facet boundaries. Tokenizing code per-segment (as the implementation this was
 * ported from does) breaks any fence containing a link, because the ``` markers
 * land in a different segment from the body and each piece parses as ordinary
 * text. Code blocks routinely contain URLs, and atproto autolinks bare URLs, so
 * this is common rather than exotic.
 *
 * Tokenizing the *full text* first fixes it: a facet that falls inside a code
 * span is discarded, since its text already belongs to the code token.
 *
 * Facets are likewise opaque to emphasis. That keeps `https://x.com/a_b_c` from
 * italicising mid-URL, and means a facet is never split in half - an emphasis
 * range covering one just styles it whole.
 *
 * Known limitation: atproto's link detection absorbs a delimiter that directly
 * follows a URL into the URL, so `**see https://x.com**` stores a facet whose
 * text ends in `**`. The closer then sits inside a facet and cannot pair, and
 * the markers render literally. The stored link is already wrong at that point,
 * so there is nothing a renderer can honestly do about it.
 *
 * Offsets throughout are UTF-16 code units, not the UTF-8 byte offsets facets
 * use on the wire. Segment text concatenates back to `richText.text`, so a
 * running length is enough to place each segment and no conversion is needed.
 */
import {type RichText as RichTextAPI, type RichTextSegment} from '@atproto/api'

import {
  type EmphasisStyle,
  findEmphasis,
  hasEmphasis,
  styleAt,
} from './emphasis'
import {type CodeToken, findCodeSpans, hasCode} from './parse'

export type RichTextItem =
  /** A facet segment (mention/link/tag) rendered whole, optionally styled. */
  | {kind: 'segment'; segment: RichTextSegment; style?: EmphasisStyle}
  /** A run of plain text with emphasis delimiters already removed. */
  | {kind: 'text'; text: string; style?: EmphasisStyle}
  /** Inline or fenced code. Wins over any facet it overlaps. */
  | {kind: 'code'; token: Exclude<CodeToken, {type: 'text'}>}

type Range = {start: number; end: number}

/** Fast guard: skip the whole pipeline for text with no formatting markers. */
export function hasFormatting(text: string): boolean {
  return hasCode(text) || hasEmphasis(text)
}

function sameStyle(a?: EmphasisStyle, b?: EmphasisStyle): boolean {
  return (
    !!a?.bold === !!b?.bold &&
    !!a?.italic === !!b?.italic &&
    !!a?.strike === !!b?.strike
  )
}

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end
}

function covering(ranges: readonly Range[], index: number): Range | undefined {
  return ranges.find(r => index >= r.start && index < r.end)
}

/**
 * Resolves `richText` into one ordered stream of items.
 *
 * Set `renderCode` to false for emphasis-only callers, such as a notification
 * preview. Code spans are still located, because they are the `skip` ranges that
 * keep `` `a * b` `` from italicising, but each one is emitted as its literal
 * source text instead of a code token.
 */
export function segmentsWithCode(
  richText: RichTextAPI,
  {renderCode = true}: {renderCode?: boolean} = {},
): RichTextItem[] {
  const text = richText.text
  const codeSpans = findCodeSpans(text)

  // Place each segment in the source text by accumulating lengths.
  const placed: {start: number; end: number; segment: RichTextSegment}[] = []
  let cursor = 0
  for (const segment of richText.segments()) {
    const start = cursor
    cursor += segment.text.length
    placed.push({start, end: cursor, segment})
  }

  // Facets that survive code (a facet inside a fence is part of the code) are
  // opaque to emphasis, alongside the code spans themselves.
  const facetRanges = placed
    .filter(p => p.segment.facet && !codeSpans.some(c => overlaps(c, p)))
    .map(({start, end}) => ({start, end}))

  const {spans: emphasis, hidden} = findEmphasis(text, [
    ...codeSpans,
    ...facetRanges,
  ])

  const items: RichTextItem[] = []

  /** Emits [start, end) as plain text, dropping delimiters and splitting on style. */
  const pushText = (start: number, end: number) => {
    let buffer = ''
    let style = styleAt(emphasis, start)
    const flush = () => {
      if (buffer) items.push({kind: 'text', text: buffer, style})
      buffer = ''
    }
    for (let i = start; i < end; ) {
      const hide = covering(hidden, i)
      if (hide) {
        i = Math.min(hide.end, end)
        continue
      }
      const next = styleAt(emphasis, i)
      if (!sameStyle(next, style)) {
        flush()
        style = next
      }
      buffer += text[i]
      i++
    }
    flush()
  }

  let pos = 0
  let si = 0
  while (pos < text.length) {
    const code = codeSpans.find(c => pos >= c.start && pos < c.end)
    if (code) {
      // Emit once, at the span's start; the rest of the range is consumed.
      if (pos === code.start) {
        items.push(
          renderCode
            ? {kind: 'code', token: code.token}
            : {kind: 'text', text: text.slice(code.start, code.end)},
        )
      }
      pos = code.end
      continue
    }

    const nextCode = codeSpans.find(c => c.start > pos)
    const limit = nextCode ? nextCode.start : text.length

    while (si < placed.length && placed[si].end <= pos) si++
    const current = placed[si]
    if (!current) {
      pushText(pos, limit)
      pos = limit
      continue
    }

    // A facet that is wholly clear of code renders as one unit, so link and
    // mention text is never chopped up (`toShortUrl` needs the whole thing).
    if (current.segment.facet && current.start >= pos && current.end <= limit) {
      items.push({
        kind: 'segment',
        segment: current.segment,
        style: styleAt(emphasis, current.start),
      })
      pos = current.end
      continue
    }

    const chunkEnd = Math.min(current.end, limit)
    pushText(pos, chunkEnd)
    pos = chunkEnd
  }

  return items
}
