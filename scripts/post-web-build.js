const path = require('node:path')
const fs = require('node:fs')
const {execFileSync} = require('node:child_process')

const projectRoot = path.join(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const bskywebStatic = path.join(projectRoot, 'bskyweb', 'static')
const templatesDir = path.join(projectRoot, 'bskyweb', 'templates')
const templateFile = path.join(templatesDir, 'scripts.html')
const fontsTemplateFile = path.join(templatesDir, 'fonts.html')

// Parse dist/index.html for entrypoint scripts and stylesheets injected by Metro.
// Metro injects <link rel="preload/stylesheet"> and <script> tags referencing
// /_expo/static/ paths, optionally prefixed by `experiments.baseUrl` (e.g. /static).
// We capture from /_expo/static/ onward so the captured path is independent of baseUrl.
//
// We preserve the _expo/static/ structure when copying to bskyweb/static, because
// Metro's runtime chunk loader and source maps embed these paths. Rewriting them
// would mean rewriting the chunk loader and every .map file's references; not worth it.
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')

// Find all CSS stylesheet links pointing to _expo (skips preload links).
const cssEntries = []
const cssRegex = /<link\b[^>]*href="[^"]*?(\/_expo\/static\/css\/[^"]+)"[^>]*>/g
let match
while ((match = cssRegex.exec(indexHtml)) !== null) {
  if (match[0].includes('rel="stylesheet"')) {
    cssEntries.push(match[1])
  }
}

// Find all script src entries pointing to _expo
const jsEntries = []
const jsRegex = /<script\b[^>]*src="[^"]*?(\/_expo\/static\/js\/[^"]+)"[^>]*>/g
while ((match = jsRegex.exec(indexHtml)) !== null) {
  jsEntries.push(match[1])
}

if (jsEntries.length === 0) {
  // Fail loudly: an empty scripts.html silently breaks the deployed app.
  throw new Error(
    'No JS entrypoints found in dist/index.html. ' +
      'Metro may have changed its output format; update post-web-build.js.',
  )
}

console.log(`Found ${jsEntries.length} script entrypoints`)
console.log(`Found ${cssEntries.length} CSS entrypoints`)

// Generate scripts.html template.
// Map /_expo/static/... to {{ staticCDNHost }}/static/_expo/static/... so the
// path matches what we copy into bskyweb/static below.
const outputLines = []

for (const href of cssEntries) {
  const cdnPath = href.replace(/^\//, '{{ staticCDNHost }}/static/')
  outputLines.push(`<link rel="stylesheet" href="${cdnPath}">`)
}

for (const src of jsEntries) {
  const cdnPath = src.replace(/^\//, '{{ staticCDNHost }}/static/')
  outputLines.push(`<script defer="defer" src="${cdnPath}"></script>`)
}

console.log(`Writing ${templateFile}`)
fs.writeFileSync(templateFile, outputLines.join('\n'))

// Generate fonts.html — preload + @font-face for the splash, using the same
// content-hashed paths Metro emits for the bundle. Avoids shipping a duplicate
// font copy under /static/media/ and ensures the preload is actually used.
// northsky: use the same brand fonts extracted from unusedUseFonts.ts by Expo.
const brandFonts = [
  {
    directory: 'geist',
    file: 'Geist-Variable',
    family: 'Geist',
    style: 'normal',
  },
  {
    directory: 'museomoderno',
    file: 'MuseoModerno-Variable',
    family: 'MuseoModerno',
    style: 'normal',
  },
  {
    directory: 'museomoderno',
    file: 'MuseoModerno-Italic-Variable',
    family: 'MuseoModerno',
    style: 'italic',
  },
]
let fixedIndexHtml = indexHtml
const fontFaces = brandFonts.map(font => {
  const relativeDir = `/assets/assets/fonts/${font.directory}/`
  const directory = path.join(distDir, relativeDir)
  const file = fs.existsSync(directory)
    ? fs
        .readdirSync(directory)
        .find(
          name => name.startsWith(`${font.file}.`) && name.endsWith('.woff2'),
        )
    : undefined
  if (!file) throw new Error(`Could not find ${font.file} font in ${directory}`)
  fixedIndexHtml = fixedIndexHtml.replaceAll(
    `${relativeDir}${font.file}.woff2`,
    `${relativeDir}${file}`,
  )
  const url = `{{ staticCDNHost }}/static${relativeDir}${file}`
  return {font, url}
})
if (fixedIndexHtml !== indexHtml) {
  fs.writeFileSync(path.join(distDir, 'index.html'), fixedIndexHtml)
}
const fontsHtml = `<link rel="preload" as="font" type="font/woff2" href="${fontFaces[0].url}" crossorigin>
<style>
${fontFaces
  .map(
    ({font, url}) => `  @font-face {
    font-family: '${font.family}';
    src: url("${url}") format('woff2');
    font-weight: 100 900;
    font-style: ${font.style};
    font-display: swap;
  }`,
  )
  .join('\n')}
</style>
`
console.log(`Writing ${fontsTemplateFile}`)
fs.writeFileSync(fontsTemplateFile, fontsHtml)

// Clean previous build output to avoid stale files
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true})
    console.log(`Cleaned ${dir}`)
  }
}

cleanDir(path.join(bskywebStatic, '_expo'))
cleanDir(path.join(bskywebStatic, 'assets'))

// Recursively copy a directory.
function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`Skipping ${sourceDir} (does not exist)`)
    return
  }
  fs.mkdirSync(targetDir, {recursive: true})
  const entries = fs.readdirSync(sourceDir, {withFileTypes: true})
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath)
    } else {
      fs.copyFileSync(sourcePath, targetPath)
      console.log(`Copied ${sourcePath} to ${targetPath}`)
    }
  }
}

// Copy Metro's _expo/ tree wholesale so JS chunks (including lazy chunks
// referenced by hash) and source maps resolve at the same paths the runtime expects.
copyDir(path.join(distDir, '_expo'), path.join(bskywebStatic, '_expo'))

// Copy assets (fonts, images, icons, etc.) referenced as /static/assets/... by the bundle.
copyDir(path.join(distDir, 'assets'), path.join(bskywebStatic, 'assets'))

// Upload source maps to Sentry
if (
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_AUTH_TOKEN != 'unknown'
) {
  const release =
    process.env.SENTRY_RELEASE || require('../package.json').version
  /*
   * The runtime reports EXPO_PUBLIC_RELEASE_VERSION || package.json version
   * (src/env/common.ts), so maps uploaded under a bogus release never match
   * incoming events. "null"/"undefined" catch `jq -r '.version'` stringifying
   * a missing package.json version field.
   */
  if (!release || release === 'null' || release === 'undefined') {
    throw new Error(
      `Refusing to upload source maps under invalid Sentry release ${JSON.stringify(release)}. ` +
        'Set SENTRY_RELEASE or restore the "version" field in package.json.',
    )
  }
  const dist = process.env.SENTRY_DIST || undefined
  const sourceMapDir = path.join(distDir, '_expo', 'static')

  console.log(`Uploading source maps to Sentry (release: ${release})`)
  const args = [
    'sourcemaps',
    'upload',
    '--org',
    process.env.SENTRY_ORG || 'northsky-social-cooperative',
    '--project',
    process.env.SENTRY_PROJECT || 'social-app',
    '--release',
    release,
    ...(dist ? ['--dist', dist] : []),
    sourceMapDir,
  ]
  try {
    execFileSync('sentry-cli', args, {stdio: 'inherit', cwd: projectRoot})
    console.log('Sentry source map upload complete')
  } catch (e) {
    console.error('Sentry source map upload failed:', e.message)
    process.exit(1)
  }
} else {
  console.log('Skipping Sentry source map upload (SENTRY_AUTH_TOKEN not set)')
}
