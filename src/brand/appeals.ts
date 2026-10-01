import {type Client, type Service, XrpcResponseError} from '@atproto/lex'

import {com, tools} from '#/lexicons'

/** Older independent moderation services accept appeals through createReport. */
export async function submitModerationAppeal(
  client: Client,
  input: tools.ozone.inbox.appealActionedSubject.$InputBody,
  options: {service: Service},
): Promise<void> {
  try {
    await client.call(tools.ozone.inbox.appealActionedSubject, input, options)
  } catch (error) {
    if (
      !(error instanceof XrpcResponseError) ||
      error.error !== 'MethodNotImplemented'
    ) {
      throw error
    }
    await client.call(
      com.atproto.moderation.createReport,
      {
        subject: input.subject,
        reason: input.reason,
        reasonType: tools.ozone.report.defs.reasonAppeal.value,
      },
      options,
    )
  }
}
