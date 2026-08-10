import {useQuery} from '@tanstack/react-query'

import {getRecordByUri, resolveMiniDoc} from '#/lib/slingshot/client'
import {STALE} from '#/state/queries'
import {
  parseTangledStringValue,
  STRING_COLLECTION,
  type TangledStringValue,
} from './lexicon'

export type TangledStringData = {
  did: string
  value: TangledStringValue
}

/**
 * Reads a `sh.tangled.string` record. The code is inline in the record, so this
 * single read is all the card needs.
 *
 * A PDS only serves records for repos it hosts and the snippet rarely lives on
 * the viewer's PDS, so the read goes through Slingshot, which already handles
 * identity resolution and cross-PDS record fetching for this app.
 *
 * The owner's profile is deliberately not fetched here: the byline reads it
 * through `useProfileQuery`, so it shares the app-wide `['profile', did]` cache
 * instead of hiding a second copy behind this key.
 */
export function useTangledStringQuery({
  actor,
  rkey,
  enabled = true,
}: {
  actor: string
  rkey: string
  enabled?: boolean
}) {
  return useQuery<TangledStringData>({
    queryKey: ['tangledString', actor, rkey],
    enabled: enabled && !!actor && !!rkey,
    queryFn: async () => {
      const miniDoc = await resolveMiniDoc(actor)
      if (!miniDoc) throw new Error(`could not resolve ${actor}`)
      const {did} = miniDoc

      const record = await getRecordByUri(
        `at://${did}/${STRING_COLLECTION}/${rkey}`,
      )
      if (!record) throw new Error('snippet not found')

      const value = parseTangledStringValue(record.value)
      if (!value) throw new Error('snippet is not a readable string record')

      return {did, value}
    },
    staleTime: STALE.MINUTES.FIVE,
  })
}
