jest.mock('node:fs', () => ({
  readFileSync: () => '<script src="/_expo/static/js/web.js"></script>',
  writeFileSync: jest.fn(),
  existsSync: () => true,
  readdirSync: (_directory, options) =>
    options
      ? []
      : [
          'Geist-Variable.hash.woff2',
          'MuseoModerno-Variable.hash.woff2',
          'MuseoModerno-Italic-Variable.hash.woff2',
        ],
  rmSync: jest.fn(),
  mkdirSync: jest.fn(),
}))
const mockExecFileSync = jest.fn()
jest.mock('node:child_process', () => ({execFileSync: mockExecFileSync}))

const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
  process.env = {
    ...originalEnv,
    SENTRY_AUTH_TOKEN: 'test-token',
    SENTRY_RELEASE: '',
  }
  jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  process.env = originalEnv
  jest.restoreAllMocks()
})

test.each([null, {}, {version: 123}, {version: null}])(
  'rejects invalid package metadata (%#) without uploading',
  metadata => {
    jest.doMock('../package.json', () => metadata)
    expect(() => require('./post-web-build')).toThrow(
      'Expected a string version',
    )
    expect(mockExecFileSync).not.toHaveBeenCalled()
  },
)

test.each(['', 'null', 'undefined'])(
  'rejects invalid version %s without uploading',
  version => {
    jest.doMock('../package.json', () => ({version}))
    expect(() => require('./post-web-build')).toThrow('invalid Sentry release')
    expect(mockExecFileSync).not.toHaveBeenCalled()
  },
)

test('uploads using the validated package version', () => {
  jest.doMock('../package.json', () => ({version: '1.2.3'}))
  require('./post-web-build')
  expect(mockExecFileSync).toHaveBeenCalledWith(
    'sentry-cli',
    expect.arrayContaining(['--release', 'xyz.blueskyweb.app@1.2.3']),
    expect.any(Object),
  )
})

test('explicit release does not require a package version', () => {
  process.env.SENTRY_RELEASE = 'xyz.blueskyweb.app@custom'
  jest.doMock('../package.json', () => ({}))
  require('./post-web-build')
  expect(mockExecFileSync).toHaveBeenCalledWith(
    'sentry-cli',
    expect.arrayContaining(['--release', 'xyz.blueskyweb.app@custom']),
    expect.any(Object),
  )
})
