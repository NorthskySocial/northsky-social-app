import {getRuntimeDonationsConfig} from '#/features/support/runtimeConfig.web'

describe('getRuntimeDonationsConfig (web)', () => {
  afterEach(() => {
    delete globalThis.__NORTHSKY_DONATIONS__
  })

  it('returns undefined when bskyweb did not inject a config', () => {
    expect(getRuntimeDonationsConfig()).toBeUndefined()
  })

  it('returns the value bskyweb injected', () => {
    globalThis.__NORTHSKY_DONATIONS__ = '{"currency":"usd"}'

    expect(getRuntimeDonationsConfig()).toBe('{"currency":"usd"}')
  })
})
