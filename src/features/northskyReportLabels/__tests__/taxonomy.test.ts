import {describe, expect, it} from '@jest/globals'

import {tools} from '#/lexicons'
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
  tools.ozone.report.defs.reasonAppeal.value,
  tools.ozone.report.defs.reasonViolenceGraphicContent.value,
  tools.ozone.report.defs.reasonSexualAnimal.value,
  tools.ozone.report.defs.reasonSexualUnlabeled.value,
  tools.ozone.report.defs.reasonChildSafetyCSAM.value,
  tools.ozone.report.defs.reasonChildSafetyGroom.value,
  tools.ozone.report.defs.reasonChildSafetyPrivacy.value,
  tools.ozone.report.defs.reasonChildSafetyHarassment.value,
  tools.ozone.report.defs.reasonChildSafetyOther.value,
  tools.ozone.report.defs.reasonHarassmentTroll.value,
  tools.ozone.report.defs.reasonHarassmentTargeted.value,
  tools.ozone.report.defs.reasonHarassmentHateSpeech.value,
  tools.ozone.report.defs.reasonHarassmentDoxxing.value,
  tools.ozone.report.defs.reasonHarassmentOther.value,
  tools.ozone.report.defs.reasonMisleadingImpersonation.value,
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
      getNorthskyLabelsForReason(
        tools.ozone.report.defs.reasonSexualAnimal.value,
      ),
    ).toEqual(['bestiality', 'apologia-zoophilia'])
  })

  it('returns nothing for an unmapped reason', () => {
    expect(
      getNorthskyLabelsForReason(
        tools.ozone.report.defs.reasonMisleadingSpam.value,
      ),
    ).toEqual([])
  })
})
