/**
 * Rewrites icon modules in src/components/icons from vendored Tabler SVGs.
 *
 * Run from the repository root:
 *   node scripts/generate-tabler-icons.mjs
 *
 * The SVGs under src/assets/tabler are the source of truth, so a regeneration
 * needs no external checkout. Set TABLER_ICONS_PATH to a tabler/tabler-icons
 * checkout only when the mapping starts naming an icon that is not vendored.
 *
 * The mapping of export name to Tabler icon lives in
 * src/features/tablerIcons/mapping.json.
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
const ASSETS_DIR = join(ROOT, 'src', 'assets', 'tabler')
const MAPPING_FILE = join(
  ROOT,
  'src',
  'features',
  'tablerIcons',
  'mapping.json',
)
const MAPPING = JSON.parse(readFileSync(MAPPING_FILE, 'utf8'))

const VARIANT_DIR = {
  outline: join(ASSETS_DIR, 'outline'),
  filled: join(ASSETS_DIR, 'filled'),
}

/** Every icon the mapping names, as [variant, fileName] pairs. */
function mappedIcons() {
  const icons = []
  for (const exports of Object.values(MAPPING)) {
    for (const spec of Object.values(exports)) {
      const variant = spec.variant ?? 'outline'
      if (VARIANT_DIR[variant]) icons.push([variant, `${spec.tabler}.svg`])
    }
  }
  return icons
}

/** Copies any newly mapped SVG in from a tabler/tabler-icons checkout. */
function vendorMissingIcons() {
  const missing = mappedIcons().filter(
    ([variant, file]) => !existsSync(join(VARIANT_DIR[variant], file)),
  )
  if (missing.length === 0) return

  const source = process.env.TABLER_ICONS_PATH
  if (!source) {
    console.error('These mapped icons are not vendored yet:')
    for (const [variant, file] of missing) {
      console.error(`  ${variant}/${file}`)
    }
    console.error('Set TABLER_ICONS_PATH to a tabler/tabler-icons checkout.')
    process.exit(1)
  }

  for (const [variant, file] of missing) {
    copyFileSync(
      join(source, 'icons', variant, file),
      join(VARIANT_DIR[variant], file),
    )
    console.log(`vendored ${variant}/${file}`)
  }
}

vendorMissingIcons()

/** Reads the path data out of a Tabler SVG, in document order. */
function tablerPaths(name, variant) {
  const svg = readFileSync(join(VARIANT_DIR[variant], `${name}.svg`), 'utf8')
  const paths = [...svg.matchAll(/<path\s+d="([^"]+)"/g)].map(m => m[1])
  if (paths.length === 0) {
    throw new Error(`${name}.svg has no <path> elements`)
  }
  const others = svg.match(/<(circle|rect|line|polyline|ellipse)\b/g)
  if (others) {
    throw new Error(
      `${name}.svg uses ${others.join(', ')}, which the generator cannot emit`,
    )
  }
  return paths
}

/** Export names the file declares today. */
function currentExports(file) {
  const src = readFileSync(join(ICONS_DIR, file), 'utf8')
  return [...src.matchAll(/^export const ([A-Za-z0-9_]+)/gm)].map(m => m[1])
}

function render(entries) {
  const helpers = new Set()

  const body = entries
    .map(([name, spec]) => {
      const variant = spec.variant ?? 'outline'
      const helper =
        variant === 'filled' ? 'createTablerFilledIcon' : 'createTablerIcon'
      helpers.add(helper)

      const paths = tablerPaths(spec.tabler, variant)
        .map(p => `    ${JSON.stringify(p)},`)
        .join('\n')
      /* A filled icon has no stroke, so a stroke width there is a mistake. */
      const width =
        variant === 'filled' || spec.strokeWidth === undefined
          ? ''
          : `\n  strokeWidth: ${spec.strokeWidth},`
      const rotate =
        spec.rotate === undefined ? '' : `\n  rotate: ${spec.rotate},`

      return (
        `/** Tabler: ${spec.tabler} (${variant}) */\n` +
        `export const ${name} = ${helper}({\n` +
        `  paths: [\n${paths}\n  ],${width}${rotate}\n})`
      )
    })
    .join('\n\n')

  const imported = [...helpers].sort().join(', ')

  return (
    `/**\n` +
    ` * Generated from Tabler icons. Do not edit by hand.\n` +
    ` *\n` +
    ` * Regenerate with scripts/generate-tabler-icons.mjs.\n` +
    ` */\n` +
    `// northsky: upstream glyphs replaced with Tabler icons\n` +
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

  const badVariant = mapped.filter(
    name => !VARIANT_DIR[exports[name].variant ?? 'outline'],
  )
  if (badVariant.length) {
    skipped.push([file, `unknown variant on ${badVariant.join(', ')}`])
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
