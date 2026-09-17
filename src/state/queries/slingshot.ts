import {type Client} from '@atproto/lex'
import {type AtIdentifierString, AtUri} from '@atproto/syntax'
import {useQuery} from '@tanstack/react-query'

import {getRecordByUri, resolveMiniDoc} from '#/lib/slingshot/client'
import {getPostInteractionCounts} from '#/lib/slingshot/constellation'
import {
  hydrateAvatarUrl,
  hydratePostView,
  hydratePostViewRecord,
} from '#/lib/slingshot/hydrate'
import {isNetworkError, shouldRetryError} from '#/lib/strings/errors'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAppviewClient} from '#/state/session'
import {APP_LABELER_DIDS} from '#/brand/moderation'
import {app, com} from '#/lexicons'
import * as bsky from '#/types/bsky'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const LABELS_PAGE_SIZE = 100
const slingshotRecordQueryKey = (atUri: string) =>
  createQueryKey('slingshot-record', {atUri, labelerDids: APP_LABELER_DIDS})

/*
 * Slingshot serves the raw record, which carries no labels. The app labelers
 * are asked for them separately, so a labelled post recovered this way is
 * still moderated. When neither the label query nor the author fallback
 * answers, the caller drops the recovery rather than render unlabelled
 * content.
 */
async function getPostLabels({
  client,
  uri,
  authorDid,
}: {
  client: Client
  uri: string
  authorDid: string
}): Promise<com.atproto.label.defs.Label[] | undefined> {
  try {
    let cursor: string | undefined
    const labels: com.atproto.label.defs.Label[] = []

    do {
      const response = await client.call(com.atproto.label.queryLabels, {
        uriPatterns: [uri],
        sources: APP_LABELER_DIDS,
        limit: LABELS_PAGE_SIZE,
        cursor,
      })
      labels.push(...response.labels)
      cursor = response.cursor
    } while (cursor)

    return labels
  } catch {
    try {
      const profile = await client.call(app.bsky.actor.getProfile, {
        actor: authorDid as AtIdentifierString,
      })
      return profile.labels ?? []
    } catch {
      return undefined
    }
  }
}

export async function getSlingshotPost({
  client,
  atUri,
}: {
  client: Client
  atUri: string
}): Promise<app.bsky.feed.defs.PostView | undefined> {
  const recovered = await getSlingshotPostData({client, atUri})
  if (!recovered) return undefined

  return hydratePostView(
    recovered.record.value,
    recovered.record.uri,
    recovered.record.cid ?? '',
    recovered.miniDoc,
    recovered.counts,
    recovered.labels,
  )
}

export async function getPostThreadWithSlingshotFallback({
  client,
  anchor,
  getThread,
  toThreadItem,
}: {
  client: Client
  anchor: string
  getThread: () => Promise<app.bsky.unspecced.getPostThreadV2.$OutputBody>
  toThreadItem: (
    post: app.bsky.feed.defs.PostView,
  ) => app.bsky.unspecced.getPostThreadV2.ThreadItem
}): Promise<app.bsky.unspecced.getPostThreadV2.$OutputBody> {
  const getFallbackThread = async () => {
    try {
      const post = await getSlingshotPost({client, atUri: anchor})
      return post
        ? {thread: [toThreadItem(post)], hasOtherReplies: false}
        : undefined
    } catch {
      return undefined
    }
  }

  let data: app.bsky.unspecced.getPostThreadV2.$OutputBody
  try {
    data = await getThread()
  } catch (error) {
    if (!isNetworkError(error) && !shouldRetryError(error)) {
      throw error
    }

    const fallback = await getFallbackThread()
    if (fallback) return fallback
    throw error
  }

  const anchorItem = data.thread.find(item => item.depth === 0)
  if (
    !anchorItem ||
    !bsky.isType(app.bsky.unspecced.defs.threadItemNotFound, anchorItem.value)
  ) {
    return data
  }

  return (await getFallbackThread()) ?? data
}

async function getSlingshotPostData({
  client,
  atUri,
}: {
  client: Client
  atUri: string
}) {
  let uri: AtUri
  try {
    uri = new AtUri(atUri)
  } catch {
    return undefined
  }
  if (uri.collection !== 'app.bsky.feed.post' || !uri.rkey) {
    return undefined
  }

  const [record, miniDoc, counts] = await Promise.all([
    getRecordByUri(atUri),
    resolveMiniDoc(uri.host),
    getPostInteractionCounts(atUri),
  ])
  if (!record || !miniDoc || !bsky.isType(app.bsky.feed.post, record.value)) {
    return undefined
  }

  const labels = await getPostLabels({
    client,
    uri: record.uri,
    authorDid: miniDoc.did,
  })
  if (!labels) return undefined

  return {record, miniDoc, counts, labels}
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
  const client = useAppviewClient()
  return useQuery<app.bsky.embed.record.ViewRecord | undefined>({
    queryKey: slingshotRecordQueryKey(atUri),
    queryFn: async () => {
      const recovered = await getSlingshotPostData({client, atUri})
      if (!recovered) return undefined
      return hydratePostViewRecord(
        recovered.record.value,
        recovered.record.uri,
        recovered.record.cid ?? '',
        recovered.miniDoc,
        recovered.counts,
        recovered.labels,
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
