import {
  type AppBskyLabelerDefs,
  type InterpretedLabelValueDefinition,
  interpretLabelValueDefinitions,
  type ToolsOzoneReportDefs as OzoneReportDefs,
} from '@atproto/api'

import {BRAND} from '#/brand/config'
import {getHostModerationInfo} from '#/brand/moderation'
import {getNorthskyLabelsForReason} from './taxonomy'

const NORTHSKY_MOD_SERVICE_DID = getHostModerationInfo(
  BRAND.pdsServiceUrl,
).modServiceDid

/**
 * Whether the given DID is Northsky's own moderation service.
 *
 * The reporter picks the label before the service, so a report can carry a
 * Northsky label and then be sent elsewhere. Only Northsky understands these
 * label values, so the label must be dropped for every other service.
 */
export function isNorthskyModerationDid(did: string): boolean {
  return did === NORTHSKY_MOD_SERVICE_DID
}

/**
 * The label to send to the given moderation service.
 *
 * This is the one place that keeps a Northsky label from reaching another
 * service. Both the report comment and `modTool.meta` read from it.
 */
export function resolveLabelForRecipient({
  label,
  recipientDid,
}: {
  label?: string
  recipientDid: string
}): string | undefined {
  return label && isNorthskyModerationDid(recipientDid) ? label : undefined
}

/**
 * The Northsky label definitions that refine the given report reason.
 *
 * The taxonomy is intersected with the labeler's live record, so a label that
 * Northsky retires disappears from the report dialog without an app change.
 * The taxonomy order is kept because it groups related labels together, while
 * the record is alphabetical.
 *
 * Pass the labelers that support this report, not every subscribed labeler.
 * A report that cannot reach Northsky must not ask for a Northsky label,
 * because the label is dropped before it is sent.
 */
export function resolveNorthskyReportLabels({
  reason,
  labelers,
  recipientDid,
}: {
  reason?: OzoneReportDefs.ReasonType
  labelers?: AppBskyLabelerDefs.LabelerViewDetailed[]
  /** The chosen service, if the reporter has chosen one yet. */
  recipientDid?: string
}): InterpretedLabelValueDefinition[] {
  if (!reason || !labelers?.length) return []
  if (recipientDid && !isNorthskyModerationDid(recipientDid)) return []

  const identifiers = getNorthskyLabelsForReason(reason)
  if (!identifiers.length) return []

  const northsky = labelers.find(
    labeler => labeler.creator.did === NORTHSKY_MOD_SERVICE_DID,
  )
  if (!northsky) return []

  const definitions = interpretLabelValueDefinitions(northsky)
  return identifiers
    .map(identifier =>
      definitions.find(definition => definition.identifier === identifier),
    )
    .filter(definition => definition !== undefined)
}
