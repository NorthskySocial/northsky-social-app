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

export function getTransferEndpoint(id: TransferEndpointId): TransferEndpoint {
  return TRANSFER_ENDPOINTS.find(endpoint => endpoint.id === id)!
}
