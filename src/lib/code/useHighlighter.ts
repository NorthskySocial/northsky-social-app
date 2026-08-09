import {useEffect, useState} from 'react'

import {
  highlightToLines,
  isHighlighterReady,
  type Line,
  loadHighlighter,
  plainLines,
} from './highlight'

/**
 * Loads the syntax highlighter grammars on demand and reports when they land.
 *
 * Returns false on the first render of the first code block in a session, then
 * true once the chunk resolves. Already-loaded sessions never see the false
 * state, and the result is cached, so this costs one frame of unhighlighted
 * code exactly once.
 */
export function useHighlighter(): boolean {
  const [ready, setReady] = useState(isHighlighterReady)

  useEffect(() => {
    if (ready) return
    let cancelled = false
    void loadHighlighter().then(loaded => {
      if (!cancelled && loaded) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [ready])

  return ready
}

/**
 * Highlighted lines for `code`, falling back to plain lines until the grammars
 * are available.
 *
 * The two branches are deliberate: reading `ready` as a value is what makes the
 * result recompute once loading finishes. Collapsing them into a single call
 * would let the compiler memoize on `code`/`language` alone and leave the first
 * block permanently unhighlighted.
 */
export function useHighlightedLines(code: string, language?: string): Line[] {
  const ready = useHighlighter()
  return ready ? highlightToLines(code, language) : plainLines(code)
}
