import {
  type AppBskyLabelerDefs,
  BSKY_LABELER_DID,
  ToolsOzoneReportDefs as OzoneReportDefs,
} from '@atproto/api'
import {describe, expect, it} from '@jest/globals'

import {
  isNorthskyModerationDid,
  resolveLabelForRecipient,
  resolveNorthskyReportLabels,
} from '../labels'

const NORTHSKY_MOD_DID = 'did:plc:p2cxrw3ank4dzs55mpm6ohq4'
const OTHER_LABELER_DID = 'did:plc:zg5qexfd2mkddsbmnrgr3dom'

function makeLabeler(
  did: string,
  identifiers: string[],
): AppBskyLabelerDefs.LabelerViewDetailed {
  return {
    uri: `at://${did}/app.bsky.labeler.service/self`,
    cid: 'bafyreiciddoesnotmatter',
    creator: {
      did,
      handle: 'moderation.northsky.social',
    },
    indexedAt: '2026-08-17T00:00:00.000Z',
    policies: {
      labelValues: identifiers,
      labelValueDefinitions: identifiers.map(identifier => ({
        identifier,
        severity: 'alert',
        blurs: 'content',
        defaultSetting: 'hide',
        adultOnly: false,
        locales: [{lang: 'en', name: identifier, description: identifier}],
      })),
    },
  }
}

describe('resolveNorthskyReportLabels', () => {
  it('returns the labels that refine the reason, in taxonomy order', () => {
    const labels = resolveNorthskyReportLabels({
      reason: OzoneReportDefs.REASONSEXUALANIMAL,
      labelers: [
        makeLabeler(NORTHSKY_MOD_DID, ['bestiality', 'apologia-zoophilia']),
      ],
    })
    expect(labels.map(l => l.identifier)).toEqual([
      'bestiality',
      'apologia-zoophilia',
    ])
  })

  it('returns nothing when the Northsky labeler is absent', () => {
    expect(
      resolveNorthskyReportLabels({
        reason: OzoneReportDefs.REASONSEXUALANIMAL,
        labelers: [makeLabeler(OTHER_LABELER_DID, ['bestiality'])],
      }),
    ).toEqual([])
  })

  it('returns nothing for a reason the taxonomy does not map', () => {
    expect(
      resolveNorthskyReportLabels({
        reason: OzoneReportDefs.REASONMISLEADINGSPAM,
        labelers: [makeLabeler(NORTHSKY_MOD_DID, ['bestiality'])],
      }),
    ).toEqual([])
  })

  /*
   * The taxonomy is a static copy of external Ozone state. Intersecting it
   * with the live record keeps a retired label out of the dialog without an
   * app change.
   */
  it('drops labels the live record no longer publishes', () => {
    const labels = resolveNorthskyReportLabels({
      reason: OzoneReportDefs.REASONSEXUALANIMAL,
      labelers: [makeLabeler(NORTHSKY_MOD_DID, ['bestiality'])],
    })
    expect(labels.map(l => l.identifier)).toEqual(['bestiality'])
  })

  /*
   * The submit step drops a label bound for another service, so asking for one
   * on a report that cannot reach Northsky would waste the reporter's time.
   * Chat and status reports go to Bluesky alone, which reaches this branch as
   * a supported-labeler list without Northsky in it.
   */
  it('returns nothing once another service is chosen', () => {
    expect(
      resolveNorthskyReportLabels({
        reason: OzoneReportDefs.REASONSEXUALANIMAL,
        labelers: [makeLabeler(NORTHSKY_MOD_DID, ['bestiality'])],
        recipientDid: OTHER_LABELER_DID,
      }).map(l => l.identifier),
    ).toEqual([])
  })

  it('still returns labels once Northsky is chosen', () => {
    expect(
      resolveNorthskyReportLabels({
        reason: OzoneReportDefs.REASONSEXUALANIMAL,
        labelers: [makeLabeler(NORTHSKY_MOD_DID, ['bestiality'])],
        recipientDid: NORTHSKY_MOD_DID,
      }).map(l => l.identifier),
    ).toEqual(['bestiality'])
  })

  it('returns nothing without a reason or labelers', () => {
    expect(resolveNorthskyReportLabels({labelers: []})).toEqual([])
    expect(
      resolveNorthskyReportLabels({
        reason: OzoneReportDefs.REASONSEXUALANIMAL,
      }),
    ).toEqual([])
  })
})

describe('isNorthskyModerationDid', () => {
  it('recognises the Northsky moderation service', () => {
    expect(isNorthskyModerationDid(NORTHSKY_MOD_DID)).toBe(true)
  })

  it('rejects every other service', () => {
    expect(isNorthskyModerationDid(OTHER_LABELER_DID)).toBe(false)
    expect(isNorthskyModerationDid(BSKY_LABELER_DID)).toBe(false)
  })
})

/*
 * This gate is the only thing that keeps a Northsky label out of another
 * service's report queue. Both the report comment and `modTool.meta` read from
 * it, so a regression here would leak the label in two places at once.
 */
describe('resolveLabelForRecipient', () => {
  it('sends the label to Northsky', () => {
    expect(
      resolveLabelForRecipient({
        label: 'ableism',
        recipientDid: NORTHSKY_MOD_DID,
      }),
    ).toBe('ableism')
  })

  it('withholds the label from every other service', () => {
    for (const did of [BSKY_LABELER_DID, OTHER_LABELER_DID]) {
      expect(
        resolveLabelForRecipient({label: 'ableism', recipientDid: did}),
      ).toBeUndefined()
    }
  })

  it('sends nothing when the reporter picked no label', () => {
    expect(
      resolveLabelForRecipient({recipientDid: NORTHSKY_MOD_DID}),
    ).toBeUndefined()
  })
})
