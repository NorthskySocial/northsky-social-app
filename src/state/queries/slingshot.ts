import {
  type AppBskyEmbedRecord,
  type AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyUnspeccedDefs,
  type AppBskyUnspeccedGetPostThreadV2,
  type AtpAgent,
  AtUri,
  type ComAtprotoLabelDefs,
} from '@atproto/api'
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
import {useAgent} from '#/state/session'
import {APP_LABELER_DIDS} from '#/brand/moderation'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const LABELS_PAGE_SIZE = 100
const slingshotRecordQueryKey = (atUri: string) =>
  createQueryKey('slingshot-record', {atUri, labelerDids: APP_LABELER_DIDS})

async function getPostLabels({
  agent,
  uri,
  authorDid,
}: {
  agent: AtpAgent
  uri: string
  authorDid: string
}): Promise<ComAtprotoLabelDefs.Label[] | undefined> {
  try {
    let cursor: string | undefined
    const labels: ComAtprotoLabelDefs.Label[] = []

    do {
      const response = await agent.api.com.atproto.label.queryLabels({
        uriPatterns: [uri],
        sources: APP_LABELER_DIDS,
        limit: LABELS_PAGE_SIZE,
        cursor,
      })
      if (!response.success) throw new Error('Label query failed')
      labels.push(...response.data.labels)
      cursor = response.data.cursor
    } while (cursor)

    return labels
  } catch {
    try {
      const response = await agent.getProfile({actor: authorDid})
      return response.success ? (response.data.labels ?? []) : undefined
    } catch {
      return undefined
    }
  }
}

export async function getSlingshotPost({
  agent,
  atUri,
}: {
  agent: AtpAgent
  atUri: string
}): Promise<AppBskyFeedDefs.PostView | undefined> {
  const recovered = await getSlingshotPostData({agent, atUri})
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
  agent,
  anchor,
  getThread,
  toThreadItem,
}: {
  agent: AtpAgent
  anchor: string
  getThread: () => Promise<AppBskyUnspeccedGetPostThreadV2.OutputSchema>
  toThreadItem: (
    post: AppBskyFeedDefs.PostView,
  ) => AppBskyUnspeccedGetPostThreadV2.ThreadItem
}): Promise<AppBskyUnspeccedGetPostThreadV2.OutputSchema> {
  const getFallbackThread = async () => {
    try {
      const post = await getSlingshotPost({agent, atUri: anchor})
      return post
        ? {thread: [toThreadItem(post)], hasOtherReplies: false}
        : undefined
    } catch {
      return undefined
    }
  }

  let data: AppBskyUnspeccedGetPostThreadV2.OutputSchema
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
    !AppBskyUnspeccedDefs.isThreadItemNotFound(anchorItem.value)
  ) {
    return data
  }

  return (await getFallbackThread()) ?? data
}

async function getSlingshotPostData({
  agent,
  atUri,
}: {
  agent: AtpAgent
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
  if (!record || !miniDoc || !AppBskyFeedPost.isRecord(record.value)) {
    return undefined
  }

  const labels = await getPostLabels({
    agent,
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
  const agent = useAgent()
  return useQuery<AppBskyEmbedRecord.ViewRecord | undefined>({
    queryKey: slingshotRecordQueryKey(atUri),
    queryFn: async () => {
      const recovered = await getSlingshotPostData({agent, atUri})
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
