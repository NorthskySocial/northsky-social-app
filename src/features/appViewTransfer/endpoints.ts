import {BLACKSKY_APPVIEW, FALLBACK_APPVIEW} from '#/brand/appview'
import {type TransferEndpoint, type TransferEndpointId} from './types'

/**
 * The only endpoints a transfer can touch. Northsky routes accounts between
 * exactly these two appviews, so the pair is fixed. The eurosky original took
 * a URL from the user, which needs DID resolution and validation that this
 * feature can do without.
 */
export const TRANSFER_ENDPOINTS: readonly TransferEndpoint[] = [
  {id: 'bluesky', did: FALLBACK_APPVIEW.did, url: FALLBACK_APPVIEW.url},
  {id: 'blacksky', did: BLACKSKY_APPVIEW.did, url: BLACKSKY_APPVIEW.url},
]

/**
 * A checkpoint stored by an older build can name an endpoint this build no
 * longer has. A caller that reads an id from storage must filter it through
 * this guard, because the stored type does not prove the id is still valid.
 */
export function isTransferEndpointId(
  id: string | undefined,
): id is TransferEndpointId {
  return TRANSFER_ENDPOINTS.some(endpoint => endpoint.id === id)
}

/** Throws on an unknown id rather than pass `undefined` to a request. */
export function getTransferEndpoint(id: TransferEndpointId): TransferEndpoint {
  const endpoint = TRANSFER_ENDPOINTS.find(candidate => candidate.id === id)
  if (!endpoint) {
    throw new Error(`Unknown transfer endpoint: ${id}`)
  }
  return endpoint
}
