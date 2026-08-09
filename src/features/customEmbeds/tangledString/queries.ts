import {type AppBskyActorDefs} from '@atproto/api'
import {useQuery} from '@tanstack/react-query'

import {getRecordByUri, resolveMiniDoc} from '#/lib/slingshot/client'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {STRING_COLLECTION, type TangledStringValue} from './lexicon'

export type TangledStringData = {
  did: string
  value: TangledStringValue
  /** Owner profile, best-effort (the card still renders without it). */
  author?: AppBskyActorDefs.ProfileViewDetailed
}

/**
 * Reads a `sh.tangled.string` record. The code is inline in the record, so this
 * single read is all the card needs.
 *
 * A PDS only serves records for repos it hosts and the snippet rarely lives on
 * the viewer's PDS, so the read goes through Slingshot, which already handles
 * identity resolution and cross-PDS record fetching for this app. The author
 * profile comes from the appview for the byline and is allowed to fail without
 * blocking the snippet.
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
  const agent = useAgent()
  return useQuery<TangledStringData>({
    queryKey: ['tangledString', actor, rkey],
    enabled: enabled && !!actor && !!rkey,
    queryFn: async () => {
      const miniDoc = await resolveMiniDoc(actor)
      if (!miniDoc) throw new Error(`could not resolve ${actor}`)
      const {did} = miniDoc

      const [record, author] = await Promise.all([
        getRecordByUri(`at://${did}/${STRING_COLLECTION}/${rkey}`),
        agent
          .getProfile({actor: did})
          .then(r => r.data)
          .catch(() => undefined),
      ])
      if (!record) throw new Error('snippet not found')

      return {did, value: record.value, author}
    },
    staleTime: STALE.MINUTES.FIVE,
  })
}
