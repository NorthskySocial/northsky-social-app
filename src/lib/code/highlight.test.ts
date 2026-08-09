import {beforeAll, describe, expect, it} from '@jest/globals'

import {
  highlightToLines,
  isHighlighterReady,
  languageFromFilename,
  languageFromName,
  loadHighlighter,
} from './highlight'

describe('languageFromName', () => {
  it('maps extension aliases to language names', () => {
    expect(languageFromName('ts')).toBe('typescript')
    expect(languageFromName('sh')).toBe('bash')
    expect(languageFromName('yml')).toBe('yaml')
  })

  it('passes through full language names', () => {
    expect(languageFromName('typescript')).toBe('typescript')
    expect(languageFromName('python')).toBe('python')
  })

  it('is case and whitespace insensitive', () => {
    expect(languageFromName('  TS  ')).toBe('typescript')
  })

  it('returns undefined for an empty label', () => {
    expect(languageFromName(undefined)).toBeUndefined()
    expect(languageFromName('   ')).toBeUndefined()
  })
})

describe('languageFromFilename', () => {
  it('maps a filename extension', () => {
    expect(languageFromFilename('test.ts')).toBe('typescript')
    expect(languageFromFilename('main.rs')).toBe('rust')
  })

  it('returns undefined for an unknown or missing extension', () => {
    expect(languageFromFilename('LICENSE')).toBeUndefined()
    expect(languageFromFilename(undefined)).toBeUndefined()
  })
})

describe('highlightToLines before the grammars load', () => {
  it('returns unscoped lines so code still renders as plain monospace', () => {
    // Runs before the beforeAll below, while the highlighter is unloaded.
    if (isHighlighterReady()) return
    expect(highlightToLines('const x = 1')).toEqual([[{value: 'const x = 1'}]])
  })
})

describe('highlightToLines once loaded', () => {
  beforeAll(async () => {
    await expect(loadHighlighter()).resolves.toBe(true)
  })

  it('reports ready', () => {
    expect(isHighlighterReady()).toBe(true)
  })

  it('splits code into lines', () => {
    const lines = highlightToLines('const a = 1\nconst b = 2', 'typescript')
    expect(lines).toHaveLength(2)
  })

  it('assigns scopes to tokens', () => {
    const lines = highlightToLines('const x = 1', 'typescript')
    const scopes = lines[0].map(s => s.scope).filter(Boolean)
    expect(scopes).toContain('keyword')
  })

  it('preserves the code text across spans', () => {
    const code = 'function greet() {\n  return "hi"\n}'
    const lines = highlightToLines(code, 'javascript')
    const rebuilt = lines.map(l => l.map(s => s.value).join('')).join('\n')
    expect(rebuilt).toBe(code)
  })

  it('normalizes CRLF line endings', () => {
    expect(highlightToLines('a\r\nb', 'text')).toHaveLength(2)
  })

  it('preserves empty lines', () => {
    const lines = highlightToLines('a\n\nb', 'typescript')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toEqual([])
  })

  it('auto-detects when no language is given', () => {
    const lines = highlightToLines('def greet():\n    return 1')
    const rebuilt = lines.map(l => l.map(s => s.value).join('')).join('\n')
    expect(rebuilt).toBe('def greet():\n    return 1')
  })

  it('falls back to plain text for an unknown language', () => {
    const lines = highlightToLines('%%% not a language %%%', 'nonsense-lang')
    const rebuilt = lines.map(l => l.map(s => s.value).join('')).join('\n')
    expect(rebuilt).toBe('%%% not a language %%%')
  })

  it('returns a cached result on repeat calls', () => {
    const a = highlightToLines('const cached = 1', 'typescript')
    const b = highlightToLines('const cached = 1', 'typescript')
    expect(b).toBe(a)
  })
})
