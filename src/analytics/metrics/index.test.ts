import '#/analytics/metrics'

import {MetricsClient} from '#/analytics/metrics/client'

// A value that differs from the real switch, so a hardcoded flag fails the test
jest.mock('#/features/telemetry', () => ({TELEMETRY_ENABLED: true}))

jest.mock('#/analytics/metrics/client', () => ({
  MetricsClient: jest.fn(),
}))

describe('metrics singleton', () => {
  it('passes the telemetry switch to the client', () => {
    expect(MetricsClient).toHaveBeenCalledWith({enabled: true})
  })
})
