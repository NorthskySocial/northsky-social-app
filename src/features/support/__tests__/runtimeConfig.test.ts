import {getRuntimeDonationsConfig} from '#/features/support/runtimeConfig'

describe('getRuntimeDonationsConfig (native)', () => {
  it('always returns undefined, since only the web server injects a config', () => {
    expect(getRuntimeDonationsConfig()).toBeUndefined()
  })
})
