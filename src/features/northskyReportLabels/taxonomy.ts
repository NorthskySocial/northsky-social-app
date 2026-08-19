import {tools} from '#/lexicons'

/**
 * Northsky label values that refine each report reason.
 *
 * A report carries an Ozone `reasonType` from a fixed lexicon enum. Northsky
 * label values are not valid reason types, so the reporter picks the reason
 * first and then names the label. The label travels to Ozone in
 * `modTool.meta`. See `src/components/moderation/ReportDialog/action.ts`.
 *
 * Each key must be a reason type that the Northsky labeler declares in its
 * service record. If it is not declared, the report dialog never offers
 * Northsky for that reason and the labels below stay unreachable.
 */
export const REASON_TO_NORTHSKY_LABELS: Partial<
  Record<tools.ozone.report.defs.ReasonType, readonly string[]>
> = {
  [tools.ozone.report.defs.reasonHarassmentTargeted.value]: [
    'harassment',
    'stalking',
  ],
  [tools.ozone.report.defs.reasonHarassmentDoxxing.value]: ['doxing'],
  [tools.ozone.report.defs.reasonHarassmentOther.value]: [
    'apologia-abuse',
    'undermining-wrecking',
  ],
  [tools.ozone.report.defs.reasonHarassmentHateSpeech.value]: [
    'ableism',
    'antisemitism',
    'islamophobia',
    'misogyny',
    'racism',
    'whorephobia',
    'xenophobia',
    'acephobia',
    'biphobia',
    'enbyphobia',
    'homophobia',
    'queerphobia',
    'transphobia',
    'apologia-transphobia',
  ],
  [tools.ozone.report.defs.reasonChildSafetyHarassment.value]: [
    'endangering-minor',
  ],
  [tools.ozone.report.defs.reasonSexualUnlabeled.value]: ['nsfw-doesnt-tag'],
  [tools.ozone.report.defs.reasonSexualAnimal.value]: [
    'bestiality',
    'apologia-zoophilia',
  ],
  [tools.ozone.report.defs.reasonViolenceGraphicContent.value]: [
    'graphic-media',
  ],
  [tools.ozone.report.defs.reasonMisleadingImpersonation.value]: [
    'impersonation',
  ],
}

/**
 * Northsky label values that this map leaves out on purpose. Keep this list
 * with the map so that a future reader does not add them back by mistake.
 *
 * - `csam` and `apologia-pedophilia` map to reason types that
 *   `BSKY_LABELER_ONLY_REPORT_REASONS` sends only to Bluesky.
 * - `animal-abuse` and `spreading-misinformation` need `reasonViolenceAnimal`
 *   and `reasonMisleadingOther` on the Ozone service record first.
 * - `parody` describes content. It is not a violation.
 */
export const EXCLUDED_NORTHSKY_LABELS: readonly string[] = [
  'csam',
  'apologia-pedophilia',
  'animal-abuse',
  'spreading-misinformation',
  'parody',
]

/** The Northsky label values that refine the given reason, if any. */
export function getNorthskyLabelsForReason(
  reason: tools.ozone.report.defs.ReasonType,
): readonly string[] {
  return REASON_TO_NORTHSKY_LABELS[reason] ?? []
}
