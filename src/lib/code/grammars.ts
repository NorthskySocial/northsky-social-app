/**
 * The highlight.js grammars we register, and the `lowlight` instance built from
 * them.
 *
 * This module is the lazy-load boundary: `#/lib/code/highlight` pulls it in via
 * `await import()`, so on web the grammars land in their own chunk and a
 * session that never renders code never downloads them. Keeping the static
 * imports in here (rather than 20-odd dynamic ones at the call site) means the
 * bundler sees one clean boundary.
 *
 * Registering an explicit list rather than lowlight's `common` (~37 grammars)
 * both shrinks the payload and makes this the single source of truth: the same
 * list drives auto-detection, so the two can no longer drift apart.
 */
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import graphql from 'highlight.js/lib/languages/graphql'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import less from 'highlight.js/lib/languages/less'
import lua from 'highlight.js/lib/languages/lua'
import markdown from 'highlight.js/lib/languages/markdown'
import perl from 'highlight.js/lib/languages/perl'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import {createLowlight} from 'lowlight'

export const lowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  kotlin,
  less,
  lua,
  markdown,
  perl,
  php,
  python,
  r,
  ruby,
  rust,
  scss,
  sql,
  swift,
  typescript,
  xml,
  yaml,
})

/**
 * Candidate languages for auto-detection, when a fence carries no info string.
 * Limiting the subset makes highlight.js's relevance scoring far more reliable
 * on the short snippets typical of posts - scoring across every grammar
 * frequently mis-tags ordinary JS/TS as something obscure. Ordered loosely by
 * how common they are in posts.
 */
export const AUTO_SUBSET = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'json',
  'yaml',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'ruby',
  'php',
  'sql',
  'xml',
  'css',
  'scss',
  'markdown',
  'kotlin',
  'swift',
  'lua',
  'diff',
  'graphql',
]
