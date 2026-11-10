// This test reads source files, so it needs Node's fs and path.
/* oxlint-disable import/no-nodejs-modules */
import fs from 'fs'
import path from 'path'

/*
 * expo-image's web build uses `alt` only for its loading placeholder; the
 * `<img>` that replaces it gets `accessibilityLabel` and nothing else. An
 * `<Image alt=…>` therefore has no alt text on web once it loads, and screen
 * readers read nothing (or the file name). Pass both props. This scans the
 * source, because the web build can't be rendered in jest.
 */
const ROOT = path.resolve(__dirname, '..')

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(full)
    }
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

describe('expo-image alt text on web', () => {
  const images = sourceFiles(ROOT).flatMap(file => {
    const text = fs.readFileSync(file, 'utf8')
    return Array.from(text.matchAll(/<Image\b[\s\S]*?\/>/g)).map(m => ({
      file: path.relative(ROOT, file),
      jsx: m[0],
    }))
  })

  it('finds the Bluemoji images', () => {
    expect(images.length).toBeGreaterThanOrEqual(7)
  })

  it.each(images.map(i => [i.file, i.jsx]))(
    '%s: every <Image> with alt also sets accessibilityLabel',
    (_file, jsx) => {
      if (/\balt=/.test(jsx)) expect(jsx).toMatch(/\baccessibilityLabel=/)
    },
  )
})
