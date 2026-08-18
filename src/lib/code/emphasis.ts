/**
 * Markdown-style emphasis in post text: `**bold**`, `*italic*`, `_italic_` and
 * `~~strikethrough~~`.
 *
 * Emphasis is deliberately inline-only. Headings, lists and markdown link
 * syntax are out of scope - links are the facet layer's job, and duplicating
 * them here would fight autolinking.
 *
 * The hard part is *not* matching. Asterisks and underscores are common in
 * ordinary prose (`snake_case`, `2 * 3`, `* bullet`), so this implements
 * CommonMark's left/right-flanking delimiter run rules, which exist precisely
 * to keep those literal. See https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis
 *
 * Output is a set of *overlay ranges* rather than a tree: each matched pair
 * contributes a styled content range plus the delimiter ranges to hide.
 * Overlapping ranges compose (nested `**bold *italic* **` yields two ranges,
 * and the renderer unions their styles), which lets emphasis coexist with
 * facets - a bolded link is just a link whose range also carries `bold`.
 */

export type EmphasisStyle = {bold?: true; italic?: true; strike?: true}

/** A styled range of source text, in UTF-16 code unit offsets. */
export type EmphasisSpan = {start: number; end: number; style: EmphasisStyle}

/** A delimiter run (or part of one) that was consumed and must not render. */
export type HiddenSpan = {start: number; end: number}

export type EmphasisResult = {
  spans: EmphasisSpan[]
  hidden: HiddenSpan[]
  matches: EmphasisMatch[]
}

export type EmphasisMatch = {
  start: number
  end: number
  contentStart: number
  contentEnd: number
  style: EmphasisStyle
}

const EMPTY: EmphasisResult = {spans: [], hidden: [], matches: []}

/** Fast guard: no delimiter char means no work to do. */
export function hasEmphasis(text: string): boolean {
  return /[*_~]/.test(text)
}

function isWhitespace(ch: string | undefined): boolean {
  // Start/end of input counts as whitespace for flanking purposes.
  return ch === undefined || /\s/.test(ch)
}

function isPunctuation(ch: string | undefined): boolean {
  if (ch === undefined) return false
  return /[\p{P}\p{S}]/u.test(ch)
}

type Run = {
  char: string
  start: number
  end: number
  canOpen: boolean
  canClose: boolean
  /** Delimiters consumed so far, from the inner side of the run. */
  used: number
}

function remaining(run: Run): number {
  return run.end - run.start - run.used
}

/**
 * Splits `text` into delimiter runs, skipping any that fall inside `skip`
 * (code spans - code wins over emphasis, so `` `a * b` `` never italicises).
 */
function findRuns(
  text: string,
  skip: readonly {start: number; end: number}[],
): Run[] {
  const runs: Run[] = []
  const inSkip = (i: number) => skip.some(s => i >= s.start && i < s.end)

  for (let i = 0; i < text.length; ) {
    const char = text[i]
    if (char !== '*' && char !== '_' && char !== '~') {
      i++
      continue
    }
    let end = i
    while (end < text.length && text[end] === char) end++

    if (inSkip(i)) {
      i = end
      continue
    }

    const before = i > 0 ? text[i - 1] : undefined
    const after = end < text.length ? text[end] : undefined

    // CommonMark: a left-flanking run is not followed by whitespace, and is
    // either not followed by punctuation or is preceded by whitespace or
    // punctuation. Right-flanking is the mirror image.
    const leftFlanking =
      !isWhitespace(after) &&
      (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before))
    const rightFlanking =
      !isWhitespace(before) &&
      (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after))

    // `_` additionally cannot open or close intraword, which is what keeps
    // `snake_case_name` literal. `*` and `~` have no such restriction.
    const canOpen =
      char === '_'
        ? leftFlanking && (!rightFlanking || isPunctuation(before))
        : leftFlanking
    const canClose =
      char === '_'
        ? rightFlanking && (!leftFlanking || isPunctuation(after))
        : rightFlanking

    runs.push({char, start: i, end, canOpen, canClose, used: 0})
    i = end
  }
  return runs
}

/**
 * Finds emphasis in `text`, ignoring delimiters inside `skip` ranges.
 *
 * Delimiters are consumed from the inner side of each run outward, two at a
 * time when both sides allow it (strong) and otherwise one (emphasis), so
 * `**bold *italic***` resolves the way a reader expects. Unmatched delimiters
 * are simply left alone and render literally.
 */
export function findEmphasis(
  text: string,
  skip: readonly {start: number; end: number}[] = [],
): EmphasisResult {
  if (!hasEmphasis(text)) return EMPTY

  const runs = findRuns(text, skip)
  if (runs.length < 2) return EMPTY

  const spans: EmphasisSpan[] = []
  const hidden: HiddenSpan[] = []
  const matches: EmphasisMatch[] = []
  const open: Run[] = []

  for (const run of runs) {
    if (run.canClose) {
      while (remaining(run) > 0) {
        // Nearest still-open run of the same delimiter char.
        let openerIdx = -1
        for (let j = open.length - 1; j >= 0; j--) {
          if (open[j].char === run.char && remaining(open[j]) > 0) {
            openerIdx = j
            break
          }
        }
        if (openerIdx === -1) break
        const opener = open[openerIdx]

        const canPairTwo = remaining(opener) >= 2 && remaining(run) >= 2
        // `~~` is the only valid strikethrough form; a single `~` is literal.
        if (run.char === '~' && !canPairTwo) break
        const n = canPairTwo ? 2 : 1

        const contentStart = opener.end - opener.used
        const contentEnd = run.start + run.used

        // A closer immediately following its opener has no content; consume the
        // delimiters anyway so they don't dangle, but emit no span.
        if (contentEnd > contentStart) {
          const style: EmphasisStyle =
            run.char === '~'
              ? {strike: true}
              : n === 2
                ? {bold: true}
                : {italic: true}
          spans.push({start: contentStart, end: contentEnd, style})
          matches.push({
            start: contentStart - n,
            end: contentEnd + n,
            contentStart,
            contentEnd,
            style,
          })
        }

        hidden.push({start: contentStart - n, end: contentStart})
        hidden.push({start: contentEnd, end: contentEnd + n})

        opener.used += n
        run.used += n

        // Openers nested inside the span we just closed can no longer match.
        open.length = openerIdx + (remaining(opener) > 0 ? 1 : 0)
      }
    }
    if (run.canOpen && remaining(run) > 0) {
      open.push(run)
    }
  }

  if (spans.length === 0) return EMPTY
  hidden.sort((a, b) => a.start - b.start)
  return {spans, hidden, matches}
}

/** Unions the styles of every span covering `index`. */
export function styleAt(
  spans: readonly EmphasisSpan[],
  index: number,
): EmphasisStyle | undefined {
  let style: EmphasisStyle | undefined
  for (const span of spans) {
    if (index >= span.start && index < span.end) {
      style = {...style, ...span.style}
    }
  }
  return style
}
