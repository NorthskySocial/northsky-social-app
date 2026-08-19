import {type $Typed, type LexMap} from '@atproto/lex'
import {
  type AtUriString,
  type DatetimeString,
  toDatetimeString,
  type UriString,
} from '@atproto/syntax'

import {app} from '#/lexicons'
import * as bsky from '#/types/bsky'
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

/*
 * Slingshot returns raw record JSON, so every URL and date below arrives as a
 * plain string. The casts to the branded lexicon string types assert what the
 * surrounding checks already established.
 */

function hydrateImagesEmbed(
  embed: Record<string, unknown>,
  pdsUrl: string,
  did: string,
): $Typed<app.bsky.embed.images.View> | undefined {
  const images = embed.images
  if (!Array.isArray(images)) return undefined

  const viewImages: app.bsky.embed.images.ViewImage[] = []
  for (const rawImg of images) {
    if (typeof rawImg !== 'object' || rawImg == null) continue
    const img = rawImg as Record<string, unknown>
    const blob = img.image
    if (!isBlobRef(blob)) continue
    const url = buildPdsBlobUrl(pdsUrl, did, blob.ref.$link) as UriString
    viewImages.push({
      $type: 'app.bsky.embed.images#viewImage',
      thumb: url,
      fullsize: url,
      alt: typeof img.alt === 'string' ? img.alt : '',
      aspectRatio:
        img.aspectRatio as app.bsky.embed.images.ViewImage['aspectRatio'],
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
): $Typed<app.bsky.embed.external.View> | undefined {
  const ext = embed.external
  if (typeof ext !== 'object' || ext == null) return undefined
  const e = ext as Record<string, unknown>

  let thumb: UriString | undefined
  if (isBlobRef(e.thumb)) {
    thumb = buildPdsBlobUrl(pdsUrl, did, e.thumb.ref.$link) as UriString
  }

  return {
    $type: 'app.bsky.embed.external#view',
    external: {
      $type: 'app.bsky.embed.external#viewExternal',
      uri: (typeof e.uri === 'string' ? e.uri : '') as UriString,
      title: typeof e.title === 'string' ? e.title : '',
      description: typeof e.description === 'string' ? e.description : '',
      thumb,
    },
  }
}

function hydrateRecordEmbed(
  embed: Record<string, unknown>,
): $Typed<app.bsky.embed.record.View> | undefined {
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
      uri: uri as AtUriString,
      notFound: true,
    },
  }
}

function hydrateEmbed(
  rawEmbed: Record<string, unknown>,
  pdsUrl: string,
  did: string,
):
  | $Typed<app.bsky.embed.images.View>
  | $Typed<app.bsky.embed.external.View>
  | $Typed<app.bsky.embed.record.View>
  | $Typed<app.bsky.embed.recordWithMedia.View>
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

function hydrateIndexedAt(record: Record<string, unknown>): DatetimeString {
  return typeof record.createdAt === 'string'
    ? (record.createdAt as DatetimeString)
    : toDatetimeString(new Date())
}

function hydrateAuthor(
  miniDoc: SlingshotMiniDoc,
): app.bsky.actor.defs.ProfileViewBasic {
  return {
    $type: 'app.bsky.actor.defs#profileViewBasic',
    did: miniDoc.did as app.bsky.actor.defs.ProfileViewBasic['did'],
    handle: miniDoc.handle as app.bsky.actor.defs.ProfileViewBasic['handle'],
  }
}

export function hydratePostView(
  record: Record<string, unknown>,
  uri: string,
  cid: string,
  miniDoc: SlingshotMiniDoc,
  counts?: PostInteractionCounts,
): app.bsky.feed.defs.PostView {
  const rawEmbed = record.embed as Record<string, unknown> | undefined
  const embed = rawEmbed
    ? hydrateEmbed(rawEmbed, miniDoc.pds, miniDoc.did)
    : undefined

  return {
    $type: 'app.bsky.feed.defs#postView',
    uri: uri as AtUriString,
    cid,
    author: hydrateAuthor(miniDoc),
    record: record as LexMap,
    embed,
    replyCount: counts?.replyCount ?? 0,
    repostCount: counts?.repostCount ?? 0,
    likeCount: counts?.likeCount ?? 0,
    quoteCount: counts?.quoteCount ?? 0,
    indexedAt: hydrateIndexedAt(record),
  }
}

export function hydratePostViewRecord(
  record: Record<string, unknown>,
  uri: string,
  cid: string,
  miniDoc: SlingshotMiniDoc,
  counts?: PostInteractionCounts,
): $Typed<app.bsky.embed.record.ViewRecord> {
  const rawEmbed = record.embed as Record<string, unknown> | undefined
  const embed = rawEmbed
    ? hydrateEmbed(rawEmbed, miniDoc.pds, miniDoc.did)
    : undefined

  return {
    $type: 'app.bsky.embed.record#viewRecord',
    uri: uri as AtUriString,
    cid,
    author: hydrateAuthor(miniDoc),
    value: record as LexMap,
    embeds: embed ? [embed] : undefined,
    replyCount: counts?.replyCount ?? 0,
    repostCount: counts?.repostCount ?? 0,
    likeCount: counts?.likeCount ?? 0,
    quoteCount: counts?.quoteCount ?? 0,
    indexedAt: hydrateIndexedAt(record),
  }
}

export function hydrateAvatarUrl(
  record: Record<string, unknown>,
  miniDoc: SlingshotMiniDoc,
): string | undefined {
  if (!bsky.isType(app.bsky.feed.post, record)) {
    // This is a profile record, not a post
    const avatar = record.avatar
    if (!isBlobRef(avatar)) return undefined
    return buildPdsBlobUrl(miniDoc.pds, miniDoc.did, avatar.ref.$link)
  }
  return undefined
}
