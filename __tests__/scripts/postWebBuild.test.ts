/* oxlint-disable import/no-nodejs-modules -- Exercises the production build script against isolated export output. */
import {execFileSync} from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const script = readFileSync(resolve('scripts/post-web-build.js'), 'utf8')
let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'northsky-web-build-'))
  for (const dir of [
    'scripts',
    'dist/_expo/static/js/web',
    'dist/assets/assets/fonts/geist',
    'dist/assets/assets/fonts/museomoderno',
    'bskyweb/templates',
    'bin',
  ]) {
    mkdirSync(join(directory, dir), {recursive: true})
  }
  writeFileSync(join(directory, 'scripts/post-web-build.js'), script)
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({version: '1.131.0'}),
  )
  writeFileSync(join(directory, 'dist/_expo/static/js/web/main.js'), 'bundle')
  for (const [dir, file] of [
    ['geist', 'Geist-Variable'],
    ['museomoderno', 'MuseoModerno-Variable'],
    ['museomoderno', 'MuseoModerno-Italic-Variable'],
  ]) {
    writeFileSync(
      join(directory, `dist/assets/assets/fonts/${dir}/${file}.hash.woff2`),
      'font',
    )
  }
  writeFileSync(
    join(directory, 'dist/index.html'),
    '<script src="/static/_expo/static/js/web/main.js"></script><link href="/assets/assets/fonts/geist/Geist-Variable.woff2"><style>url(/assets/assets/fonts/museomoderno/MuseoModerno-Italic-Variable.woff2)</style>',
  )
  const executable = join(directory, 'bin/sentry-cli')
  writeFileSync(
    executable,
    `#!/usr/bin/env node\nrequire('node:fs').writeFileSync('sentry-args.json', JSON.stringify(process.argv.slice(2)))\n`,
  )
  chmodSync(executable, 0o755)
})

afterEach(() => rmSync(directory, {recursive: true, force: true}))

function build(overrides: Record<string, string> = {}) {
  execFileSync(
    process.execPath,
    [join(directory, 'scripts/post-web-build.js')],
    {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
        SENTRY_AUTH_TOKEN: '',
        SENTRY_ORG: '',
        SENTRY_PROJECT: '',
        ...overrides,
      },
      stdio: 'pipe',
    },
  )
}

it('writes hashed brand font URLs in both shells and copies Metro chunks', () => {
  build()
  const fonts = readFileSync(
    join(directory, 'bskyweb/templates/fonts.html'),
    'utf8',
  )
  expect(fonts).toContain("font-family: 'Geist'")
  expect(fonts).toContain("font-family: 'MuseoModerno'")
  expect(fonts).toContain(
    '/static/assets/assets/fonts/museomoderno/MuseoModerno-Italic-Variable.hash.woff2',
  )
  const html = readFileSync(join(directory, 'dist/index.html'), 'utf8')
  expect(html).toContain('/assets/assets/fonts/geist/Geist-Variable.hash.woff2')
  expect(html).toContain('MuseoModerno-Italic-Variable.hash.woff2')
  expect(
    readFileSync(
      join(directory, 'bskyweb/static/_expo/static/js/web/main.js'),
      'utf8',
    ),
  ).toBe('bundle')
})

it.each([
  [{}, 'northsky-social-cooperative', 'social-app'],
  [
    {SENTRY_ORG: 'custom-org', SENTRY_PROJECT: 'custom-app'},
    'custom-org',
    'custom-app',
  ],
])(
  'uploads maps to the configured Northsky destination',
  (overrides, org, project) => {
    build({SENTRY_AUTH_TOKEN: 'fixture', ...overrides})
    const args = JSON.parse(
      readFileSync(join(directory, 'sentry-args.json'), 'utf8'),
    ) as string[]
    expect(args[args.indexOf('--org') + 1]).toBe(org)
    expect(args[args.indexOf('--project') + 1]).toBe(project)
  },
)

it('rejects an export missing the brand body font', () => {
  rmSync(join(directory, 'dist/assets/assets/fonts/geist'), {recursive: true})
  expect(() => build()).toThrow()
})
