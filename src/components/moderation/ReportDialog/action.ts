import {
  type $Typed,
  BSKY_LABELER_DID,
  type ChatBskyConvoDefs,
  type ComAtprotoModerationCreateReport,
} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useMutation} from '@tanstack/react-query'

import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import {IS_DEV} from '#/env'
/*
 * northsky: imported from the modules, not the feature barrel. The barrel also
 * exports the picker component, which would pull ALF and the native modules
 * into this file and into every test of it.
 */
import {composeReportComment} from '#/features/northskyReportLabels/comment'
import {resolveLabelForRecipient} from '#/features/northskyReportLabels/labels'
import {NEW_TO_OLD_REASONS_MAP, REPORT_MOD_TOOL_NAME} from './const'
import {type ReportState} from './state'
import {type ParsedReportSubject} from './types'

export function useSubmitReportMutation() {
  const {_} = useLingui()
  const agent = useAgent()

  return useMutation({
    async mutationFn({
      subject,
      state,
      videoTimestampSeconds,
      modCustomLabel,
    }: {
      subject: ParsedReportSubject
      state: ReportState
      /**
       * How far the viewer watched when the dialog opened, if the subject is a
       * post with a video.
       */
      videoTimestampSeconds?: number
      /**
       * northsky: the moderation service's own label value that the reporter
       * picked to refine the reason, if any. Such label values are not valid
       * reason types, so this travels at the head of the comment and in
       * `modTool.meta`.
       */
      modCustomLabel?: string
    }) {
      if (!state.selectedOption) {
        throw new Error(_(msg`Please select a reason for this report`))
      }
      if (!state.selectedLabeler) {
        throw new Error(_(msg`Please select a moderation service`))
      }

      const labeler = state.selectedLabeler
      const labelerSupportedReasonTypes = labeler.reasonTypes || []

      let reasonType = state.selectedOption.reason
      const backwardsCompatibleReasonType = NEW_TO_OLD_REASONS_MAP[reasonType]
      const supportsNewReasonType =
        labelerSupportedReasonTypes.includes(reasonType)
      const supportsOldReasonType = labelerSupportedReasonTypes.includes(
        backwardsCompatibleReasonType,
      )

      /*
       * Only fall back for backwards compatibility if the labeler
       * does not support the new reason type. If the labeler does not declare
       * supported reason types, send the new version.
       */
      if (supportsOldReasonType && !supportsNewReasonType) {
        reasonType = backwardsCompatibleReasonType
      }

      /*
       * northsky: the reporter picks the label before the service, so a report
       * can carry a label and then go elsewhere. Only Northsky understands
       * these label values.
       */
      const modCustomLabelForRecipient = resolveLabelForRecipient({
        label: modCustomLabel,
        recipientDid: labeler.creator.did,
      })
      // northsky: Ozone shows the comment to moderators, `modTool.meta` is not
      const reason = composeReportComment({
        label: modCustomLabelForRecipient,
        details: state.details,
      })

      let report:
        | ComAtprotoModerationCreateReport.InputSchema
        | (Omit<ComAtprotoModerationCreateReport.InputSchema, 'subject'> & {
            subject:
              | $Typed<ChatBskyConvoDefs.MessageRef>
              | $Typed<ChatBskyConvoDefs.ConvoRef>
          })

      switch (subject.type) {
        case 'account': {
          report = {
            reasonType,
            reason, // northsky:
            subject: {
              $type: 'com.atproto.admin.defs#repoRef',
              did: subject.did,
            },
          }
          break
        }
        case 'status':
        case 'post':
        case 'list':
        case 'feed':
        case 'starterPack': {
          report = {
            reasonType,
            reason, // northsky:
            subject: {
              $type: 'com.atproto.repo.strongRef',
              uri: subject.uri,
              cid: subject.cid,
            },
          }
          break
        }
        case 'convoMessage': {
          report = {
            reasonType,
            reason, // northsky:
            subject: {
              $type: 'chat.bsky.convo.defs#messageRef',
              messageId: subject.message.id,
              convoId: subject.convoId,
              did: subject.message.sender.did,
            },
          }
          break
        }
        case 'convo': {
          report = {
            reasonType,
            reason, // northsky:
            subject: {
              $type: 'chat.bsky.convo.defs#convoRef',
              convoId: subject.convoId,
              did: subject.did,
            },
          }
          break
        }
      }

      const modToolMeta =
        state.includeVideoTimestamp &&
        videoTimestampSeconds != null &&
        subject.type === 'post' &&
        labeler.creator.did === BSKY_LABELER_DID
          ? {videoTimestampSeconds}
          : /*
             * northsky: a structured copy for queryEvents filtering. The value
             * is one of the labeler's own published label values. The key
             * names what it is, not who reads it, so another moderation
             * service can use it unchanged.
             */
            modCustomLabelForRecipient
            ? {label: modCustomLabelForRecipient}
            : undefined

      if (modToolMeta) {
        report.modTool = {
          name: REPORT_MOD_TOOL_NAME,
          meta: modToolMeta,
        }
      }

      // northsky: read the flag from `#/env` so a test can mock the module
      if (IS_DEV) {
        logger.info('Submitting report (dry run)', {
          labeler: {
            handle: labeler.creator.handle,
          },
          report,
        })
      } else {
        await agent.createModerationReport(report, {
          encoding: 'application/json',
          headers: {
            'atproto-proxy': `${labeler.creator.did}#atproto_labeler`,
          },
        })
      }
    },
  })
}
