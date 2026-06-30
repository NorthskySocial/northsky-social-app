import {type AppBskyEmbedRecord} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {useQuery} from '@tanstack/react-query'

import {getRecordByUri, resolveMiniDoc} from '#/lib/slingshot/client'
import {getPostInteractionCounts} from '#/lib/slingshot/constellation'
import {hydrateAvatarUrl, hydratePostViewRecord} from '#/lib/slingshot/hydrate'
import {STALE} from '#/state/queries'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_US = 7 * 24 * 60 * 60 * 1_000_000 // microseconds

/**
 * Check if a TID rkey is recent enough to warrant a Slingshot lookup.
 * TIDs encode timestamps in microseconds. Posts older than 7 days
 * are likely genuinely deleted rather than just unindexed.
 */
export function isRecentTid(rkey: string): boolean {
  try {
    const tid = TID.fromStr(rkey)
    const nowUs = Date.now() * 1000
    return nowUs - tid.timestamp() < SEVEN_DAYS_US
  } catch {
    return false
  }
}

/**
 * Extract the rkey from an at-uri.
 * at://did:plc:xxx/app.bsky.feed.post/3abc123 -> "3abc123"
 */
function rkeyFromUri(atUri: string): string | undefined {
  const parts = atUri.split('/')
  return parts.length >= 5 ? parts[4] : undefined
}

/**
 * Fetch a record from Slingshot and return it as a hydrated ViewRecord
 * (suitable for rendering as a quoted post embed).
 */
export function useSlingshotRecordQuery({
  atUri,
  enabled = false,
}: {
  atUri: string
  enabled?: boolean
}) {
  return useQuery<AppBskyEmbedRecord.ViewRecord | undefined>({
    queryKey: ['slingshot-record', atUri],
    queryFn: async () => {
      // Extract DID from at-uri for identity resolution
      const didMatch = atUri.match(/^at:\/\/(did:[^/]+)/)
      if (!didMatch) return undefined

      const [record, miniDoc, counts] = await Promise.all([
        getRecordByUri(atUri),
        resolveMiniDoc(didMatch[1]),
        getPostInteractionCounts(atUri),
      ])

      if (!record || !miniDoc) return undefined

      return hydratePostViewRecord(
        record.value,
        record.uri,
        record.cid ?? '',
        miniDoc,
        counts,
      )
    },
    staleTime: STALE.MINUTES.FIVE,
    enabled,
  })
}

/**
 * Fetch a profile's avatar from Slingshot when the appview hasn't indexed it.
 * Returns a PDS-direct blob URL for the avatar.
 */
export function useSlingshotAvatarQuery({
  did,
  enabled = false,
}: {
  did: string
  enabled?: boolean
}) {
  return useQuery<string | undefined>({
    queryKey: ['slingshot-avatar', did],
    queryFn: async () => {
      const profileUri = `at://${did}/app.bsky.actor.profile/self`
      const [record, miniDoc] = await Promise.all([
        getRecordByUri(profileUri),
        resolveMiniDoc(did),
      ])

      if (!record || !miniDoc) return undefined
      return hydrateAvatarUrl(record.value, miniDoc)
    },
    staleTime: THIRTY_DAYS,
    gcTime: THIRTY_DAYS,
    enabled,
  })
}

export {isRecentTid as _isRecentTid, rkeyFromUri as _rkeyFromUri}
