import {BLACKSKY_APPVIEW, FALLBACK_APPVIEW} from '#/brand/appview'
import {type TransferEndpoint, type TransferEndpointId} from './types'

/**
 * The only endpoints a transfer can touch. A fixed pair, unlike eurosky's
 * user-supplied appview URLs: Northsky routes accounts between exactly these
 * two appviews (see `src/brand/appview.ts`), and a free-form URL field would
 * add a DID-resolution and validation surface this feature does not need.
 */
export const TRANSFER_ENDPOINTS: readonly TransferEndpoint[] = [
  {id: 'bluesky', did: FALLBACK_APPVIEW.did, url: FALLBACK_APPVIEW.url},
  {id: 'blacksky', did: BLACKSKY_APPVIEW.did, url: BLACKSKY_APPVIEW.url},
]

/**
 * A checkpoint stored by an older build can name an endpoint this build no
 * longer has. Callers that read an id from storage must filter it through this
 * guard, because the stored type is not proof of the current endpoint set.
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
