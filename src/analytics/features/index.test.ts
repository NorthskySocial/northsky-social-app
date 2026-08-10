import {init, refresh} from '#/analytics/features'

const mockGrowthbook = {
  init: jest.fn(),
  refreshFeatures: jest.fn(),
  getFeatures: jest.fn(() => ({})),
  setAttributes: jest.fn(),
}

jest.mock('#/features/telemetry', () => ({TELEMETRY_ENABLED: false}))

jest.mock('@growthbook/growthbook', () => ({setPolyfills: jest.fn()}))

jest.mock('@growthbook/growthbook-react', () => ({
  GrowthBook: jest.fn(() => mockGrowthbook),
}))

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({getString: jest.fn(), set: jest.fn()})),
}))

jest.mock('#/logger', () => ({
  Logger: {
    create: () => ({warn: jest.fn()}),
    Context: {Growthbook: 'growthbook'},
  },
}))

jest.mock('#/env', () => ({
  GROWTHBOOK_API_HOST: '',
  GROWTHBOOK_CLIENT_KEY: '',
  IS_INTERNAL: false,
}))

describe('feature gates with telemetry disabled', () => {
  it('resolves init without fetching gate definitions', async () => {
    await expect(init).resolves.toBeUndefined()

    expect(mockGrowthbook.init).not.toHaveBeenCalled()
  })

  it('skips refresh', async () => {
    await refresh({strategy: 'prefer-fresh-gates'})

    expect(mockGrowthbook.refreshFeatures).not.toHaveBeenCalled()
  })
})
