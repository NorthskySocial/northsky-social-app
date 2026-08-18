import {ToolsOzoneReportDefs as OzoneReportDefs} from '@atproto/api'
import {describe, expect, it} from '@jest/globals'

import {
  EXCLUDED_NORTHSKY_LABELS,
  getNorthskyLabelsForReason,
  REASON_TO_NORTHSKY_LABELS,
} from '../taxonomy'

/**
 * The label values that `moderation.northsky.social` publishes, and the reason
 * types it declares, both read from its `app.bsky.labeler.service` record.
 * These are a snapshot: the record is external state, so these copies are what
 * pin the map to reality.
 */
const PUBLISHED_LABELS = [
  'ableism',
  'acephobia',
  'animal-abuse',
  'antisemitism',
  'apologia-abuse',
  'apologia-pedophilia',
  'apologia-transphobia',
  'apologia-zoophilia',
  'bestiality',
  'biphobia',
  'csam',
  'doxing',
  'enbyphobia',
  'endangering-minor',
  'graphic-media',
  'harassment',
  'homophobia',
  'impersonation',
  'islamophobia',
  'misogyny',
  'nsfw-doesnt-tag',
  'parody',
  'queerphobia',
  'racism',
  'spreading-misinformation',
  'stalking',
  'transphobia',
  'undermining-wrecking',
  'whorephobia',
  'xenophobia',
]

const DECLARED_REASON_TYPES = [
  OzoneReportDefs.REASONAPPEAL,
  OzoneReportDefs.REASONVIOLENCEGRAPHICCONTENT,
  OzoneReportDefs.REASONSEXUALANIMAL,
  OzoneReportDefs.REASONSEXUALUNLABELED,
  OzoneReportDefs.REASONCHILDSAFETYCSAM,
  OzoneReportDefs.REASONCHILDSAFETYGROOM,
  OzoneReportDefs.REASONCHILDSAFETYPRIVACY,
  OzoneReportDefs.REASONCHILDSAFETYHARASSMENT,
  OzoneReportDefs.REASONCHILDSAFETYOTHER,
  OzoneReportDefs.REASONHARASSMENTTROLL,
  OzoneReportDefs.REASONHARASSMENTTARGETED,
  OzoneReportDefs.REASONHARASSMENTHATESPEECH,
  OzoneReportDefs.REASONHARASSMENTDOXXING,
  OzoneReportDefs.REASONHARASSMENTOTHER,
  OzoneReportDefs.REASONMISLEADINGIMPERSONATION,
]

const mapped = Object.values(REASON_TO_NORTHSKY_LABELS).flatMap(
  labels => labels ?? [],
)

describe('REASON_TO_NORTHSKY_LABELS', () => {
  it('only maps labels the Northsky labeler publishes', () => {
    for (const label of mapped) {
      expect(PUBLISHED_LABELS).toContain(label)
    }
  })

  it('maps each label under exactly one reason', () => {
    expect(new Set(mapped).size).toBe(mapped.length)
  })

  /*
   * A reason the labeler does not declare is filtered out of the report
   * dialog, so Northsky is never offered and its labels stay unreachable.
   */
  it('only keys on reason types the Northsky labeler declares', () => {
    for (const reason of Object.keys(REASON_TO_NORTHSKY_LABELS)) {
      expect(DECLARED_REASON_TYPES).toContain(reason)
    }
  })

  it('leaves out the excluded labels', () => {
    for (const label of EXCLUDED_NORTHSKY_LABELS) {
      expect(mapped).not.toContain(label)
    }
  })

  it('accounts for every published label', () => {
    expect([...mapped, ...EXCLUDED_NORTHSKY_LABELS].sort()).toEqual(
      [...PUBLISHED_LABELS].sort(),
    )
  })
})

describe('getNorthskyLabelsForReason', () => {
  it('returns the labels that refine a mapped reason', () => {
    expect(
      getNorthskyLabelsForReason(OzoneReportDefs.REASONSEXUALANIMAL),
    ).toEqual(['bestiality', 'apologia-zoophilia'])
  })

  it('returns nothing for an unmapped reason', () => {
    expect(
      getNorthskyLabelsForReason(OzoneReportDefs.REASONMISLEADINGSPAM),
    ).toEqual([])
  })
})
