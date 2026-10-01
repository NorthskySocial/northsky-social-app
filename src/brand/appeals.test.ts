import {type Client, XrpcResponseError} from '@atproto/lex'

import {com, tools} from '#/lexicons'
import {submitModerationAppeal} from './appeals'

const input: tools.ozone.inbox.appealActionedSubject.$InputBody = {
  subject: {$type: 'com.atproto.admin.defs#repoRef', did: 'did:plc:account'},
  action: {$type: 'tools.ozone.inbox.appealActionedSubject#takedownRef'},
  reason: 'Please review the suspension',
}
const options = {service: 'did:plc:labeler#atproto_labeler' as const}

function failure(code: string, status: number) {
  return new XrpcResponseError(
    tools.ozone.inbox.appealActionedSubject.main,
    new Response(JSON.stringify({error: code}), {status}),
    {encoding: 'application/json', body: {error: code}},
  )
}

it('uses the new appeal API when the service supports it', async () => {
  const call = jest.fn().mockResolvedValue({})
  await submitModerationAppeal({call} as unknown as Client, input, options)
  expect(call).toHaveBeenCalledTimes(1)
  expect(call).toHaveBeenCalledWith(
    tools.ozone.inbox.appealActionedSubject,
    input,
    options,
  )
})

it('falls back only when the service explicitly lacks the new method', async () => {
  const call = jest
    .fn()
    .mockRejectedValueOnce(failure('MethodNotImplemented', 501))
    .mockResolvedValue({})
  await submitModerationAppeal({call} as unknown as Client, input, options)
  expect(call).toHaveBeenLastCalledWith(
    com.atproto.moderation.createReport,
    {
      subject: input.subject,
      reason: input.reason,
      reasonType: tools.ozone.report.defs.reasonAppeal.value,
    },
    options,
  )
})

it.each([
  failure('AlreadyAppealed', 400),
  failure('AuthenticationRequired', 401),
  new Error('offline'),
])(
  'preserves semantic and transport errors without duplicating an appeal',
  async error => {
    const call = jest.fn().mockRejectedValue(error)
    await expect(
      submitModerationAppeal({call} as unknown as Client, input, options),
    ).rejects.toBe(error)
    expect(call).toHaveBeenCalledTimes(1)
  },
)

it('preserves an already-submitted appeal error from a legacy service', async () => {
  const error = new XrpcResponseError(
    com.atproto.moderation.createReport.main,
    new Response(JSON.stringify({error: 'AlreadyAppealed'}), {status: 400}),
    {encoding: 'application/json', body: {error: 'AlreadyAppealed'}},
  )
  const call = jest
    .fn()
    .mockRejectedValueOnce(failure('MethodNotImplemented', 501))
    .mockRejectedValueOnce(error)
  await expect(
    submitModerationAppeal({call} as unknown as Client, input, options),
  ).rejects.toBe(error)
  expect(call).toHaveBeenCalledTimes(2)
})
