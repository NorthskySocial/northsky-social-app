import {BRAND} from './config'

/**
 * A takedown is issued by the user's hosting provider (their PDS), which is
 * not necessarily Northsky
 * This maps known PDS hosts to the operator name and terms of
 * service to show on the Takendown screen.
 */
export interface HostTermsOfService {
  name: string
  tosUrl: string
}

const BLUESKY_TOS: HostTermsOfService = {
  name: 'Bluesky Social',
  tosUrl: 'https://bsky.social/about/support/tos',
}

const KNOWN_HOSTS = new Map<string, HostTermsOfService>([
  [
    'northsky.social',
    {
      name: 'Northsky Social',
      tosUrl: BRAND.termsOfServiceUrl,
    },
  ],
  [
    'blacksky.social',
    {
      name: 'Blacksky',
      tosUrl: 'https://blackskyweb.xyz/about/support/tos/',
    },
  ],
  ['bsky.social', BLUESKY_TOS],
])

/**
 * Resolve the operator name and ToS URL for the given account service URL.
 * Unknown or unparseable hosts fall back to the Bluesky terms of service.
 */
export function getHostTermsOfService(
  serviceUrl: string | undefined,
): HostTermsOfService {
  if (serviceUrl) {
    try {
      const host = new URL(serviceUrl).hostname
      const known = KNOWN_HOSTS.get(host)
      if (known) {
        return known
      }
    } catch {}
  }
  return BLUESKY_TOS
}
