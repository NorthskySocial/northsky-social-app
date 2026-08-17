import {
  type AppBskyLabelerDefs,
  ToolsOzoneReportDefs as OzoneReportDefs,
} from '@atproto/api'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'

import {type ReportState} from '../state'
import {type ParsedReportSubject} from '../types'

/**
 * Fixtures and a query wrapper for tests of the report submit path.
 *
 * The submit path only calls the agent when `IS_DEV` is false, so a test that
 * uses this harness must also mock `#/env`. The mock must stay in the test
 * file, because jest hoists `jest.mock` above the imports.
 */
export const NORTHSKY_MOD_DID = 'did:plc:p2cxrw3ank4dzs55mpm6ohq4'
export const OTHER_LABELER_DID = 'did:plc:zg5qexfd2mkddsbmnrgr3dom'

// The submit path reads `useLingui` for its error messages, which needs a
// provider even on the path that raises no error.
i18n.loadAndActivate({locale: 'en', messages: {}})

export function queryWrapper({children}: {children: React.ReactNode}) {
  const client = new QueryClient({
    defaultOptions: {mutations: {retry: false}, queries: {retry: false}},
  })
  return (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nProvider>
  )
}

export function makePostSubject(): ParsedReportSubject {
  return {
    type: 'post',
    uri: 'at://did:plc:author/app.bsky.feed.post/3ktest',
    cid: 'bafyreitestpostcid',
    nsid: 'app.bsky.feed.post',
    attributes: {
      reply: false,
      image: false,
      video: false,
      link: false,
      quote: false,
    },
  }
}

export function makeAccountSubject(): ParsedReportSubject {
  return {
    type: 'account',
    did: 'did:plc:author',
    nsid: 'app.bsky.actor.profile',
  }
}

function makeLabeler(did: string): AppBskyLabelerDefs.LabelerViewDetailed {
  return {
    uri: `at://${did}/app.bsky.labeler.service/self`,
    cid: 'bafyreitestlabelercid',
    creator: {did, handle: 'moderation.test'},
    indexedAt: '2026-08-17T00:00:00.000Z',
    policies: {labelValues: []},
    reasonTypes: [OzoneReportDefs.REASONHARASSMENTHATESPEECH],
  }
}

/**
 * A report that is ready to submit. `labelerDid` decides which moderation
 * service receives it, which is what the label gate reads.
 */
export function makeReportState({
  labelerDid,
  details,
}: {
  labelerDid: string
  details?: string
}): ReportState {
  return {
    selectedOption: {
      title: 'Hate speech',
      reason: OzoneReportDefs.REASONHARASSMENTHATESPEECH,
    },
    selectedLabeler: makeLabeler(labelerDid),
    details,
    detailsOpen: false,
    activeStepIndex1: 4,
    includeVideoTimestamp: false,
  }
}
