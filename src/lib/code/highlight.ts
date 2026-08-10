/**
 * Syntax highlighting via `lowlight` (highlight.js grammars).
 *
 * `lowlight` is pure JS with no DOM dependency, so the same code runs on web and
 * React Native - unlike Shiki (WASM/oniguruma) or Prism (DOM). It returns a hast
 * tree; we flatten that into lines of scoped spans so the renderer owns all
 * layout and ALF theming. The `scope` on each span is the highlight.js class
 * with the `hljs-` prefix stripped (e.g. `keyword`, `string`, `title.function_`).
 *
 * The grammars themselves live in `./grammars` and are loaded on demand, so a
 * session that never renders code never pays for them. Until they arrive
 * `highlightToLines` returns unscoped lines, which render as plain monospace.
 */
import {type Root, type RootContent} from 'hast'

export type Span = {scope?: string; value: string}
export type Line = Span[]

type Grammars = typeof import('./grammars')

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  php: 'php',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  lua: 'lua',
  r: 'r',
  pl: 'perl',
  diff: 'diff',
  patch: 'diff',
  graphql: 'graphql',
  gql: 'graphql',
}

let grammars: Grammars | undefined
let pending: Promise<Grammars> | undefined

/** True once the grammars are in memory and highlighting can run. */
export function isHighlighterReady(): boolean {
  return grammars !== undefined
}

/**
 * Loads the grammars. Idempotent and safe to call from render - concurrent
 * callers share one import. Resolves to false if the chunk fails to load, in
 * which case code keeps rendering as plain monospace.
 */
export function loadHighlighter(): Promise<boolean> {
  if (grammars) return Promise.resolve(true)
  pending ??= import('./grammars')
  return pending.then(
    mod => {
      grammars = mod
      return true
    },
    () => false,
  )
}

/**
 * Maps a filename to a highlight.js language name. Returns undefined when the
 * extension isn't recognized (callers fall back to auto-detection).
 */
export function languageFromFilename(filename?: string): string | undefined {
  if (!filename) return undefined
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext]
}

/**
 * Maps a code-fence info string (the bit after the opening ```, e.g. `ts`,
 * `typescript`, `bash`) to a language name, or undefined for auto-detection.
 * Accepts both our extension aliases (`ts`) and full language names
 * (`typescript`). Unknown labels resolve to undefined rather than erroring.
 */
export function languageFromName(name?: string): string | undefined {
  const n = name?.trim().toLowerCase()
  if (!n) return undefined
  return EXT_TO_LANG[n] ?? n
}

function scopeFromClassName(className: unknown): string | undefined {
  if (!Array.isArray(className)) return undefined
  const parts = className.map(String)
  const hljs = parts.find(c => c.startsWith('hljs-'))
  if (!hljs) return undefined
  // e.g. ['hljs-title', 'function_'] -> 'title.function_'
  return [hljs.slice(5), ...parts.filter(c => c !== hljs)].join('.')
}

function flatten(
  nodes: RootContent[],
  inherited: string | undefined,
  out: Span[],
): void {
  for (const node of nodes) {
    if (node.type === 'text') {
      out.push({scope: inherited, value: node.value})
    } else if (node.type === 'element') {
      const scope = scopeFromClassName(node.properties?.className) ?? inherited
      flatten(node.children, scope, out)
    }
  }
}

function toLines(spans: Span[]): Line[] {
  const lines: Line[] = [[]]
  for (const span of spans) {
    const parts = span.value.split('\n')
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([])
      if (part) lines[lines.length - 1].push({scope: span.scope, value: part})
    })
  }
  return lines
}

// Highlighting is pure in (code, language) and runs on the feed render path (a
// post with a fenced block re-highlights on every theme/layout/selection
// change). Cache results so repeated renders are a map lookup. Returned arrays
// are shared - callers must treat them as read-only.
//
// Bounded by characters, not by entry count: a key is a whole source file and
// the Line[] value holds one object per span, several times the source size in
// heap. Capping at 128 entries would let a session that scrolled past 128 large
// snippets retain tens of megabytes for its lifetime.
// Enough of a file to tell TypeScript from Python; scoring the whole thing buys
// no accuracy on a snippet that is all one language anyway.
const AUTO_DETECT_SAMPLE = 2048

const CACHE_MAX_CHARS = 512 * 1024
// A single snippet larger than this is cheaper to re-highlight on the rare
// re-render than to keep, and caching one would evict most of everything else.
const CACHE_MAX_ENTRY_CHARS = 32 * 1024
const cache = new Map<string, Line[]>()
let cacheChars = 0

// The key is `${language} ${code}`, so its length tracks the entry's weight
// closely enough to budget against without a second bookkeeping map.
function remember(key: string, lines: Line[]): void {
  if (key.length > CACHE_MAX_ENTRY_CHARS) return
  cache.set(key, lines)
  cacheChars += key.length
  while (cacheChars > CACHE_MAX_CHARS) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
    cacheChars -= oldest.length
  }
}

/** Visible for testing. */
export function _resetHighlightCache(): void {
  cache.clear()
  cacheChars = 0
}

/** Splits `code` into unscoped lines - what renders before the grammars load. */
export function plainLines(rawCode: string): Line[] {
  return toLines([{value: rawCode.replace(/\r\n?/g, '\n')}])
}

/**
 * Highlights `code` and splits it into lines of scoped spans. Before the
 * grammars load this returns unscoped lines, so the caller renders readable
 * plain monospace rather than nothing.
 */
export function highlightToLines(rawCode: string, language?: string): Line[] {
  // Normalize line endings so a stray \r doesn't survive into rendered lines
  // (we split on \n below); also collapses the cache key across CRLF/LF.
  const code = rawCode.replace(/\r\n?/g, '\n')

  if (!grammars) {
    return toLines([{value: code}])
  }

  const key = `${language ?? ''} ${code}`
  const cached = cache.get(key)
  if (cached) {
    // Refresh recency.
    cache.delete(key)
    cache.set(key, cached)
    return cached
  }

  const {lowlight, AUTO_SUBSET} = grammars
  const plainTree = (): Root => ({
    type: 'root',
    children: [{type: 'text', value: code}],
  })
  let tree: Root
  try {
    if (language) {
      // An explicit label that no grammar claims stays plain. Auto-detection
      // here would paint the block with an unrelated language's scopes, which
      // is worse than no highlighting at all.
      tree = lowlight.registered(language)
        ? lowlight.highlight(language, code)
        : plainTree()
    } else if (code.length <= AUTO_DETECT_SAMPLE) {
      tree = lowlight.highlightAuto(code, {subset: AUTO_SUBSET})
    } else {
      // Auto-detection scores every candidate grammar over the whole input,
      // roughly an order of magnitude dearer than highlighting with a known
      // language. Decide the language from a prefix, then highlight once.
      const detected = lowlight.highlightAuto(
        code.slice(0, AUTO_DETECT_SAMPLE),
        {subset: AUTO_SUBSET},
      ).data?.language
      tree = detected ? lowlight.highlight(detected, code) : plainTree()
    }
  } catch {
    // Unknown language or highlighter error: render as plain text.
    tree = plainTree()
  }

  const spans: Span[] = []
  flatten(tree.children, undefined, spans)
  const lines = toLines(spans)

  remember(key, lines)
  return lines
}
