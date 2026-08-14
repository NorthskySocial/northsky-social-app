/**
 * Rewrites icon modules in src/components/icons from vendored SVGs.
 *
 * Run from the repository root:
 *   node scripts/generate-tabler-icons.mjs
 *
 * The SVGs under src/assets/tabler and src/assets/gardenSvg are the source of
 * truth, so a regeneration needs no external checkout. Set TABLER_ICONS_PATH to
 * a tabler/tabler-icons checkout only when the mapping starts naming a Tabler
 * icon that is not vendored.
 *
 * The mapping of export name to icon lives in
 * src/features/tablerIcons/mapping.json. Each entry names its icon under the
 * key of the set it comes from, either "tabler" or "garden".
 *
 * The generator refuses to write a file unless the mapping covers every export
 * that file currently has. Dropping an export breaks its import sites, and a
 * silent break is worse than no conversion.
 */
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS_DIR = join(ROOT, 'src', 'components', 'icons')
const ASSETS_DIR = join(ROOT, 'src', 'assets')
const MAPPING_FILE = join(
  ROOT,
  'src',
  'features',
  'tablerIcons',
  'mapping.json',
)
const MAPPING = JSON.parse(readFileSync(MAPPING_FILE, 'utf8'))

/** The icon sets the mapping can draw from, keyed by their mapping key. */
const SOURCES = {
  tabler: {dir: join(ASSETS_DIR, 'tabler'), label: 'Tabler'},
  garden: {dir: join(ASSETS_DIR, 'gardenSvg'), label: 'Garden'},
}

const VARIANTS = ['outline', 'filled']

/** The view box `createTablerIcon` assumes when a module declares none. */
const DEFAULT_VIEW_BOX = '0 0 24 24'

/** Resolves a mapping entry to the file that holds its glyph. */
function iconOf(spec) {
  const source = Object.keys(SOURCES).find(key => spec[key] !== undefined)
  const variant = spec.variant ?? 'outline'
  if (!source || !VARIANTS.includes(variant)) return undefined
  return {source, variant, name: spec[source]}
}

function iconPath({source, variant, name}) {
  return join(SOURCES[source].dir, variant, `${name}.svg`)
}

/** Every icon the mapping names. */
function mappedIcons() {
  const icons = []
  for (const exports of Object.values(MAPPING)) {
    for (const spec of Object.values(exports)) {
      const icon = iconOf(spec)
      if (icon) icons.push(icon)
    }
  }
  return icons
}

/** Copies any newly mapped Tabler SVG in from a tabler/tabler-icons checkout. */
function vendorMissingIcons() {
  const missing = mappedIcons().filter(icon => !existsSync(iconPath(icon)))
  if (missing.length === 0) return

  const checkout = process.env.TABLER_ICONS_PATH
  const copyable = checkout
    ? missing.filter(icon => icon.source === 'tabler')
    : []

  for (const icon of copyable) {
    copyFileSync(
      join(checkout, 'icons', icon.variant, `${icon.name}.svg`),
      iconPath(icon),
    )
    console.log(`vendored ${icon.variant}/${icon.name}.svg`)
  }

  const unresolved = missing.filter(icon => !copyable.includes(icon))
  if (unresolved.length === 0) return

  console.error('These mapped icons are not vendored yet:')
  for (const icon of unresolved) {
    console.error(`  ${icon.source}/${icon.variant}/${icon.name}.svg`)
  }
  if (unresolved.some(icon => icon.source === 'tabler')) {
    console.error('Set TABLER_ICONS_PATH to a tabler/tabler-icons checkout.')
  }
  process.exit(1)
}

vendorMissingIcons()

/** Reads the path data and view box out of a vendored SVG, in document order. */
function glyphOf(icon) {
  const svg = readFileSync(iconPath(icon), 'utf8')
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => m[1])
  if (paths.length === 0) {
    throw new Error(`${icon.name}.svg has no <path> elements`)
  }
  const others = svg.match(/<(circle|rect|line|polyline|ellipse)\b/g)
  if (others) {
    throw new Error(
      `${icon.name}.svg uses ${others.join(', ')}, which the generator cannot emit`,
    )
  }
  const viewBox = svg.match(/viewBox="([^"]+)"/)
  if (!viewBox) {
    throw new Error(`${icon.name}.svg declares no viewBox`)
  }
  return {paths, viewBox: viewBox[1]}
}

/** Export names the file declares today. */
function currentExports(file) {
  const src = readFileSync(join(ICONS_DIR, file), 'utf8')
  return [...src.matchAll(/^export const ([A-Za-z0-9_]+)/gm)].map(m => m[1])
}

function render(entries) {
  const helpers = new Set()
  const labels = new Set()

  const body = entries
    .map(([name, spec]) => {
      const icon = iconOf(spec)
      const helper =
        icon.variant === 'filled'
          ? 'createTablerFilledIcon'
          : 'createTablerIcon'
      helpers.add(helper)
      labels.add(SOURCES[icon.source].label)

      const glyph = glyphOf(icon)
      const paths = glyph.paths.map(p => `    ${JSON.stringify(p)},`).join('\n')
      /* The helpers assume the Tabler view box, so only a different one is
       * worth writing out. */
      const box =
        glyph.viewBox === DEFAULT_VIEW_BOX
          ? ''
          : `\n  viewBox: ${JSON.stringify(glyph.viewBox)},`
      /* A filled icon has no stroke, so a stroke width there is a mistake. */
      const width =
        icon.variant === 'filled' || spec.strokeWidth === undefined
          ? ''
          : `\n  strokeWidth: ${spec.strokeWidth},`
      const rotate =
        spec.rotate === undefined ? '' : `\n  rotate: ${spec.rotate},`

      return (
        `/** ${SOURCES[icon.source].label}: ${icon.name} (${icon.variant}) */\n` +
        `export const ${name} = ${helper}({\n` +
        `  paths: [\n${paths}\n  ],${box}${width}${rotate}\n})`
      )
    })
    .join('\n\n')

  const imported = [...helpers].sort().join(', ')
  const from = [...labels].sort().join(' and ')

  return (
    `/**\n` +
    ` * Generated from ${from} icons. Do not edit by hand.\n` +
    ` *\n` +
    ` * Regenerate with scripts/generate-tabler-icons.mjs.\n` +
    ` */\n` +
    `// northsky: upstream glyphs replaced with ${from} icons\n` +
    `import {${imported}} from '#/features/tablerIcons/createTablerIcon'\n\n` +
    `${body}\n`
  )
}

const known = new Set(readdirSync(ICONS_DIR))
const written = []
const skipped = []

for (const [file, exports] of Object.entries(MAPPING)) {
  if (!known.has(file)) {
    skipped.push([file, 'no such icon module'])
    continue
  }

  const present = currentExports(file)
  const mapped = Object.keys(exports)
  const missing = present.filter(name => !mapped.includes(name))
  const extra = mapped.filter(name => !present.includes(name))

  if (missing.length) {
    skipped.push([file, `mapping omits ${missing.join(', ')}`])
    continue
  }
  if (extra.length) {
    skipped.push([file, `mapping names unknown export ${extra.join(', ')}`])
    continue
  }

  const unresolved = mapped.filter(name => !iconOf(exports[name]))
  if (unresolved.length) {
    skipped.push([
      file,
      `no source or unknown variant on ${unresolved.join(', ')}`,
    ])
    continue
  }

  /* Emit in the file's existing export order so the diff stays readable. */
  writeFileSync(
    join(ICONS_DIR, file),
    render(present.map(name => [name, exports[name]])),
  )
  written.push(file)
}

console.log(`wrote ${written.length} icon modules`)
for (const [file, why] of skipped) {
  console.log(`  skipped ${file}: ${why}`)
}
if (skipped.length) process.exitCode = 1
