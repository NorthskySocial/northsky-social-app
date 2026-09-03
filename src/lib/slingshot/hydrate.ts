import {
  type $Typed,
  type AppBskyActorDefs,
  type AppBskyEmbedExternal,
  type AppBskyEmbedImages,
  type AppBskyEmbedRecord,
  type AppBskyEmbedRecordWithMedia,
  type AppBskyFeedDefs,
  AppBskyFeedPost,
  type ComAtprotoLabelDefs,
} from '@atproto/api'

import {buildPdsBlobUrl} from './blobs'
import {type PostInteractionCounts, type SlingshotMiniDoc} from './types'

type BlobRef = {
  $type?: 'blob'
  ref: {$link: string}
  mimeType: string
  size: number
}

function isBlobRef(v: unknown): v is BlobRef {
  if (typeof v !== 'object' || v == null) return false
  const obj = v as Record<string, unknown>
  const ref = obj.ref
  return (
    typeof ref === 'object' &&
    ref != null &&
    typeof (ref as Record<string, unknown>).$link === 'string'
  )
}

function hydrateImagesEmbed(
  embed: Record<string, unknown>,
  pdsUrl: string,
  did: string,
): $Typed<AppBskyEmbedImages.View> | undefined {
  const images = embed.images
  if (!Array.isArray(images)) return undefined

  const viewImages: AppBskyEmbedImages.ViewImage[] = []
  for (const rawImg of images) {
    if (typeof rawImg !== 'object' || rawImg == null) continue
    const img = rawImg as Record<string, unknown>
    const blob = img.image
    if (!isBlobRef(blob)) continue
    const url = buildPdsBlobUrl(pdsUrl, did, blob.ref.$link)
    viewImages.push({
      $type: 'app.bsky.embed.images#viewImage',
      thumb: url,
      fullsize: url,
      alt: typeof img.alt === 'string' ? img.alt : '',
      aspectRatio: img.aspectRatio as
        | {width: number; height: number}
        | undefined,
    })
  }
  if (viewImages.length === 0) return undefined

  return {
    $type: 'app.bsky.embed.images#view',
    images: viewImages,
  }
}

function hydrateExternalEmbed(
  embed: Record<string, unknown>,
  pdsUrl: string,
  did: string,
): $Typed<AppBskyEmbedExternal.View> | undefined {
  const ext = embed.external
  if (typeof ext !== 'object' || ext == null) return undefined
  const e = ext as Record<string, unknown>

  let thumb: string | undefined
  if (isBlobRef(e.thumb)) {
    thumb = buildPdsBlobUrl(pdsUrl, did, e.thumb.ref.$link)
  }

  return {
    $type: 'app.bsky.embed.external#view',
    external: {
      $type: 'app.bsky.embed.external#viewExternal',
      uri: typeof e.uri === 'string' ? e.uri : '',
      title: typeof e.title === 'string' ? e.title : '',
      description: typeof e.description === 'string' ? e.description : '',
      thumb,
    },
  }
}

function hydrateRecordEmbed(
  embed: Record<string, unknown>,
): $Typed<AppBskyEmbedRecord.View> | undefined {
  const record = embed.record
  if (typeof record !== 'object' || record == null) return undefined
  const r = record as Record<string, unknown>
  const uri = r.uri
  if (typeof uri !== 'string') return undefined

  // We can't hydrate the referenced record from Slingshot recursively here,
  // so return it as viewNotFound and let the UI trigger its own fallback.
  return {
    $type: 'app.bsky.embed.record#view',
    record: {
      $type: 'app.bsky.embed.record#viewNotFound',
      uri,
      notFound: true,
    },
  }
}

function hydrateEmbed(
  rawEmbed: Record<string, unknown>,
  pdsUrl: string,
  did: string,
):
  | $Typed<AppBskyEmbedImages.View>
  | $Typed<AppBskyEmbedExternal.View>
  | $Typed<AppBskyEmbedRecord.View>
  | $Typed<AppBskyEmbedRecordWithMedia.View>
  | undefined {
  const type = rawEmbed.$type

  if (type === 'app.bsky.embed.images') {
    return hydrateImagesEmbed(rawEmbed, pdsUrl, did)
  }
  if (type === 'app.bsky.embed.external') {
    return hydrateExternalEmbed(rawEmbed, pdsUrl, did)
  }
  if (type === 'app.bsky.embed.record') {
    return hydrateRecordEmbed(rawEmbed)
  }
  if (type === 'app.bsky.embed.recordWithMedia') {
    const recordPart = rawEmbed.record as Record<string, unknown> | undefined
    const mediaPart = rawEmbed.media as Record<string, unknown> | undefined

    const hydratedRecord = recordPart
      ? hydrateRecordEmbed(recordPart)
      : undefined
    const hydratedMedia = mediaPart
      ? (hydrateImagesEmbed(mediaPart, pdsUrl, did) ??
        hydrateExternalEmbed(mediaPart, pdsUrl, did))
      : undefined

    if (!hydratedRecord || !hydratedMedia) return undefined

    return {
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: hydratedRecord,
      media: hydratedMedia,
    }
  }
  // Video embeds cannot be hydrated (need HLS playlist URL from transcoding service)
  return undefined
}

export function hydratePostView(
  record: Record<string, unknown>,
  uri: string,
  cid: string,
  miniDoc: SlingshotMiniDoc,
  counts?: PostInteractionCounts,
  labels?: ComAtprotoLabelDefs.Label[],
): AppBskyFeedDefs.PostView {
  const author: AppBskyActorDefs.ProfileViewBasic = {
    $type: 'app.bsky.actor.defs#profileViewBasic',
    did: miniDoc.did,
    handle: miniDoc.handle,
  }

  const rawEmbed = record.embed as Record<string, unknown> | undefined
  const embed = rawEmbed
    ? hydrateEmbed(rawEmbed, miniDoc.pds, miniDoc.did)
    : undefined

  return {
    $type: 'app.bsky.feed.defs#postView',
    uri,
    cid,
    author,
    record,
    embed,
    replyCount: counts?.replyCount ?? 0,
    repostCount: counts?.repostCount ?? 0,
    likeCount: counts?.likeCount ?? 0,
    quoteCount: counts?.quoteCount ?? 0,
    labels,
    indexedAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : new Date().toISOString(),
  }
}

export function hydratePostViewRecord(
  record: Record<string, unknown>,
  uri: string,
  cid: string,
  miniDoc: SlingshotMiniDoc,
  counts?: PostInteractionCounts,
  labels?: ComAtprotoLabelDefs.Label[],
): $Typed<AppBskyEmbedRecord.ViewRecord> {
  const author: AppBskyActorDefs.ProfileViewBasic = {
    $type: 'app.bsky.actor.defs#profileViewBasic',
    did: miniDoc.did,
    handle: miniDoc.handle,
  }

  const rawEmbed = record.embed as Record<string, unknown> | undefined
  const embed = rawEmbed
    ? hydrateEmbed(rawEmbed, miniDoc.pds, miniDoc.did)
    : undefined

  return {
    $type: 'app.bsky.embed.record#viewRecord',
    uri,
    cid,
    author,
    value: record,
    embeds: embed ? [embed] : undefined,
    replyCount: counts?.replyCount ?? 0,
    repostCount: counts?.repostCount ?? 0,
    likeCount: counts?.likeCount ?? 0,
    quoteCount: counts?.quoteCount ?? 0,
    labels,
    indexedAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : new Date().toISOString(),
  }
}

export function hydrateAvatarUrl(
  record: Record<string, unknown>,
  miniDoc: SlingshotMiniDoc,
): string | undefined {
  if (!AppBskyFeedPost.isRecord(record)) {
    // This is a profile record, not a post
    const avatar = record.avatar
    if (!isBlobRef(avatar)) return undefined
    return buildPdsBlobUrl(miniDoc.pds, miniDoc.did, avatar.ref.$link)
  }
  return undefined
}
