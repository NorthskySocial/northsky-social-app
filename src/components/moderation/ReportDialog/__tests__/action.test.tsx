import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {act, renderHook} from '@testing-library/react-native'

import {useSubmitReportMutation} from '../action'
import {
  makeAccountSubject,
  makePostSubject,
  makeReportState,
  NORTHSKY_MOD_DID,
  OTHER_LABELER_DID,
  queryWrapper,
} from './reportTestHarness'

const mockCreateModerationReport = jest.fn()

/*
 * The submit path logs instead of sending while `IS_DEV` is true, which it is
 * under jest. Mocking the module turns the real send on for this file alone,
 * so no test has to write to the `__DEV__` global.
 */
jest.mock('#/env', () => ({
  ...jest.requireActual<typeof import('#/env')>('#/env'),
  IS_DEV: false,
}))

jest.mock('#/state/session', () => ({
  useAgent: () => ({createModerationReport: mockCreateModerationReport}),
}))

async function submit(
  args: Parameters<
    ReturnType<typeof useSubmitReportMutation>['mutateAsync']
  >[0],
) {
  const {result} = renderHook(() => useSubmitReportMutation(), {
    wrapper: queryWrapper,
  })
  // The mutation updates its own state after it resolves, so settle inside act
  await act(async () => {
    await result.current.mutateAsync(args)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useSubmitReportMutation', () => {
  it('sends the label in the comment and the meta, proxied to Northsky', async () => {
    await submit({
      subject: makePostSubject(),
      state: makeReportState({
        labelerDid: NORTHSKY_MOD_DID,
        details: 'see the third reply',
      }),
      modCustomLabel: 'ableism',
    })

    expect(mockCreateModerationReport).toHaveBeenCalledTimes(1)
    const [report, options] = mockCreateModerationReport.mock.calls[0] as [
      Record<string, unknown>,
      {headers: Record<string, string>},
    ]
    expect(report.reason).toBe('<ableism>\nsee the third reply')
    expect(report.modTool).toEqual({
      name: expect.any(String),
      meta: {label: 'ableism'},
    })
    expect(options.headers).toEqual({
      'atproto-proxy': `${NORTHSKY_MOD_DID}#atproto_labeler`,
    })
  })

  it('sends the label alone when the reporter wrote no details', async () => {
    await submit({
      subject: makePostSubject(),
      state: makeReportState({labelerDid: NORTHSKY_MOD_DID}),
      modCustomLabel: 'transphobia',
    })

    const [report] = mockCreateModerationReport.mock.calls[0] as [
      Record<string, unknown>,
    ]
    expect(report.reason).toBe('<transphobia>')
  })

  /*
   * The reporter picks the label before the service. This is the check that
   * keeps one service's label vocabulary out of another service's queue.
   */
  it('withholds the label from another moderation service', async () => {
    await submit({
      subject: makePostSubject(),
      state: makeReportState({
        labelerDid: OTHER_LABELER_DID,
        details: 'see the third reply',
      }),
      modCustomLabel: 'ableism',
    })

    const [report, options] = mockCreateModerationReport.mock.calls[0] as [
      Record<string, unknown>,
      {headers: Record<string, string>},
    ]
    expect(report.reason).toBe('see the third reply')
    expect(report.modTool).toBeUndefined()
    expect(options.headers).toEqual({
      'atproto-proxy': `${OTHER_LABELER_DID}#atproto_labeler`,
    })
  })

  it('sends an unchanged report when the reporter picked no label', async () => {
    await submit({
      subject: makeAccountSubject(),
      state: makeReportState({
        labelerDid: NORTHSKY_MOD_DID,
        details: 'see the third reply',
      }),
    })

    const [report] = mockCreateModerationReport.mock.calls[0] as [
      Record<string, unknown>,
    ]
    expect(report.reason).toBe('see the third reply')
    expect(report.modTool).toBeUndefined()
    expect(report.subject).toEqual({
      $type: 'com.atproto.admin.defs#repoRef',
      did: 'did:plc:author',
    })
  })
})
