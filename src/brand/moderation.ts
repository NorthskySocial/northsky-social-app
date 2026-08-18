import {BSKY_LABELER_DID, type Did} from '@atproto/api'

import {BRAND} from './config'

/**
 * A takedown is issued by the user's hosting provider (their PDS), which is
 * not necessarily Northsky, and an appeal has to reach that provider's own
 * moderation service rather than Bluesky's. This maps known PDS hosts to the
 * operator name, terms of service, and moderation service used by the
 * Takendown screen.
 */
export interface HostModerationInfo {
  /** Operator name, shown to the user. */
  name: string
  tosUrl: string
  modServiceDid: Did
}

const BLUESKY: HostModerationInfo = {
  name: 'Bluesky Social',
  tosUrl: 'https://bsky.social/about/support/tos',
  modServiceDid: BSKY_LABELER_DID,
}

/** Keyed by lower-case PDS hostname, i.e. `new URL(account.service).hostname`. */
const KNOWN_HOSTS = new Map<string, HostModerationInfo>([
  [
    'northsky.social',
    {
      name: 'Northsky Social',
      tosUrl: BRAND.termsOfServiceUrl,
      modServiceDid: 'did:plc:p2cxrw3ank4dzs55mpm6ohq4',
    },
  ],
  [
    /* `blacksky.social` has no DNS record; the PDS is served from blacksky.app */
    'blacksky.app',
    {
      name: 'Blacksky Algorithms',
      tosUrl: 'https://www.blackskyweb.xyz/about/support/tos',
      modServiceDid: 'did:plc:d2mkddsbmnrgr3domzg5qexf',
    },
  ],
  ['bsky.social', BLUESKY],
])

/**
 * Resolve the operator of the given account service URL. Unknown or
 * unparseable hosts fall back to Bluesky.
 */
export function getHostModerationInfo(
  serviceUrl: string | undefined,
): HostModerationInfo {
  if (serviceUrl) {
    try {
      const host = new URL(serviceUrl).hostname.toLowerCase()
      const known = KNOWN_HOSTS.get(host)
      if (known) {
        return known
      }
    } catch {}
  }
  return BLUESKY
}

/**
 * The labelers the app applies to every user, whatever their PDS. They are
 * always on and the user cannot unsubscribe from them. Northsky is listed
 * first so it is the first report target offered, ahead of Bluesky.
 *
 * An app labeler also gets server-side redaction authority, so it can take
 * content down for every user of the app. See AGENTS.md section 4.
 */
export const APP_LABELER_DIDS: Did[] = [
  getHostModerationInfo(BRAND.pdsServiceUrl).modServiceDid,
  BSKY_LABELER_DID,
]

export function getHostModServiceHeaders(serviceUrl: string | undefined) {
  const {modServiceDid} = getHostModerationInfo(serviceUrl)
  return {'atproto-proxy': `${modServiceDid}#atproto_labeler`}
}
