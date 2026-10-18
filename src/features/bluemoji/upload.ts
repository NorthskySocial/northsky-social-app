import {SaveFormat} from 'expo-image-manipulator'
import {type BlobRef, type Client} from '@atproto/lex'
import {type AtIdentifierString} from '@atproto/syntax'

import {uploadBlob} from '#/lib/api/upload-blob'
import {renderImage} from '#/lib/media/image-manipulator'
import {getUriSize} from '#/lib/media/uriSize'
import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {com} from '#/lexicons'
import {aliasToRkey, normalizeAlias} from './alias'
import {type AnimatedFormat, detectAnimatedFormat} from './animation'
import {
  INLINE_MAX_BYTES,
  INLINE_SIZE,
  STICKER_MAX_BYTES,
  STICKER_SIZE,
} from './constants'
import {cleanProvenance} from './provenance'
import {readHead} from './readHead'
import {BLUEMOJI_ITEM_COLLECTION} from './types'

export type UploadErrorCode =
  | 'alias-taken'
  | 'too-large'
  | 'invalid-alias'
  | 'invalid-provenance'
  | 'not-copyable'

export class BluemojiUploadError extends Error {
  constructor(
    readonly code: UploadErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BluemojiUploadError'
  }
}

export type SourceImage = {
  uri: string
  width: number
  height: number
  mime: string
}

type Format = 'png' | 'webp' | 'gif' | 'apng'
type Blobs = Partial<Record<Format, BlobRef>>

type Rendition = {uri: string; format: 'png' | 'webp'}

/**
 * Centre-crop to a square and scale to `size`. Emoji are square, and
 * stretching a non-square image to fit would distort it.
 */
async function renderSquare(
  src: SourceImage,
  size: number,
  format: SaveFormat.PNG | SaveFormat.WEBP,
): Promise<string> {
  const side = Math.min(src.width, src.height)
  const result = await renderImage(
    src.uri,
    ctx => {
      if (src.width !== src.height) {
        ctx.crop({
          originX: Math.floor((src.width - side) / 2),
          originY: Math.floor((src.height - side) / 2),
          width: side,
          height: side,
        })
      }
      ctx.resize({width: size, height: size})
    },
    {format, compress: 1},
  )
  return result.uri
}

/**
 * PNG keeps transparency exactly and is preferred. When it exceeds the lexicon's
 * blob limit, WebP (also alpha-capable) is tried before giving up.
 */
async function renderStill(
  src: SourceImage,
  size: number,
  maxBytes: number,
): Promise<Rendition> {
  const png = await renderSquare(src, size, SaveFormat.PNG)
  if ((await getUriSize(png)) <= maxBytes) return {uri: png, format: 'png'}

  const webp = await renderSquare(src, size, SaveFormat.WEBP)
  if ((await getUriSize(webp)) <= maxBytes) return {uri: webp, format: 'webp'}

  throw new BluemojiUploadError(
    'too-large',
    `Image is too detailed to fit in ${Math.round(maxBytes / 1000)}kB at ${size}px`,
  )
}

type Planned = {
  /** Renditions to upload, keyed by the slot they fill. */
  uploads: {format: Format; uri: string; mime: string}[]
  /** The source was animated but could not be kept animated at this size. */
  animationDropped: boolean
}

/**
 * Plans the renditions for one size. Animated sources cannot be resized on
 * device (the image manipulator flattens them to a single frame), so the
 * original file is kept as-is when it is within the blob limit, with a still
 * alongside it for clients that cannot or should not animate. A source that is
 * too big falls back to the still alone.
 */
async function planRenditions(
  src: SourceImage,
  animated: AnimatedFormat | undefined,
  size: number,
  maxBytes: number,
): Promise<Planned> {
  const keepsAnimation = !!animated && (await getUriSize(src.uri)) <= maxBytes

  let still: Rendition | undefined
  try {
    still = await renderStill(src, size, maxBytes)
  } catch (e) {
    // A still is optional once the animation itself fits.
    if (!keepsAnimation) throw e
  }

  const uploads: Planned['uploads'] = []
  // One blob per slot: a WebP still would be replaced by the animated WebP.
  if (still && !(keepsAnimation && still.format === animated)) {
    uploads.push({
      format: still.format,
      uri: still.uri,
      mime: `image/${still.format}`,
    })
  }
  if (keepsAnimation && animated) {
    uploads.push({format: animated, uri: src.uri, mime: src.mime})
  }
  return {uploads, animationDropped: !!animated && !keepsAnimation}
}

export async function recordExists(
  client: Client,
  did: AtIdentifierString,
  rkey: string,
): Promise<boolean> {
  return client
    .call(com.atproto.repo.getRecord, {
      repo: did,
      collection: BLUEMOJI_ITEM_COLLECTION,
      rkey,
    })
    .then(
      () => true,
      e => {
        if (isRecordNotFoundError(e)) return false
        throw e
      },
    )
}

type ItemRecordInput = {
  alias: string
  alt: string
  adultOnly: boolean
  license?: string
  source?: string
  inline: Blobs
  sticker?: Blobs
  createdAt: string
}

function sized(blobs: Blobs, size: number) {
  return Object.fromEntries(
    Object.entries(blobs).map(([format, blob]) => [`${format}_${size}`, blob]),
  )
}

/**
 * The `blue.moji.collection.item` record. Writers must use `#formats_v1`, whose
 * renditions are real blobs (visible to PDS blob moderation) rather than the
 * deprecated v0 raw bytes. An item with `stickerFormats` is sticker-capable;
 * one with only `formats` is inline-only.
 */
export function buildItemRecord(input: ItemRecordInput) {
  const alias = normalizeAlias(input.alias)
  return {
    $type: BLUEMOJI_ITEM_COLLECTION,
    name: `:${alias}:`,
    ...(input.alt.trim() ? {alt: input.alt.trim()} : {}),
    createdAt: input.createdAt,
    formats: {
      $type: 'blue.moji.collection.item#formats_v1',
      ...sized(input.inline, 128),
    },
    ...(input.sticker
      ? {
          stickerFormats: {
            $type: 'blue.moji.collection.item#stickerFormats_v0',
            ...sized(input.sticker, 512),
          },
        }
      : {}),
    ...(input.adultOnly ? {adultOnly: true} : {}),
    ...(input.license ? {license: input.license} : {}),
    ...(input.source ? {source: input.source} : {}),
  }
}

export type UploadParams = {
  client: Client
  did: AtIdentifierString
  source: SourceImage
  alias: string
  alt: string
  /** Also store a 512px rendition so the item can be used as a sticker. */
  asSticker: boolean
  adultOnly: boolean
  /** SPDX expression; omit when unspecified (which is not public domain). */
  license?: string
  /** http(s) URL the image was re-uploaded from. */
  sourceUrl?: string
}

/**
 * Resizes, uploads and records one Bluemoji. `animationDropped` is set when the
 * source was animated but too large to keep animated at some size.
 */
export async function uploadBluemojiItem({
  client,
  did,
  source,
  alias,
  alt,
  asSticker,
  adultOnly,
  license,
  sourceUrl,
}: UploadParams): Promise<{rkey: string; animationDropped: boolean}> {
  let rkey: string
  try {
    rkey = aliasToRkey(alias)
  } catch (e) {
    throw new BluemojiUploadError(
      'invalid-alias',
      e instanceof Error ? e.message : 'Invalid name',
    )
  }

  const provenance = cleanProvenance(license, sourceUrl)
  if ('error' in provenance) {
    throw new BluemojiUploadError('invalid-provenance', provenance.error)
  }

  // The rkey is the alias, so writing would silently replace an existing emoji.
  if (await recordExists(client, did, rkey)) {
    throw new BluemojiUploadError('alias-taken', `:${alias}: already exists`)
  }

  /*
   * Sniffing is best effort: if the file cannot be read for sniffing, treat it
   * as a still rather than failing the upload.
   */
  const animated = await readHead(source.uri).then(
    detectAnimatedFormat,
    () => undefined,
  )

  const inline = await planRenditions(
    source,
    animated,
    INLINE_SIZE,
    INLINE_MAX_BYTES,
  )
  const sticker = asSticker
    ? await planRenditions(source, animated, STICKER_SIZE, STICKER_MAX_BYTES)
    : undefined

  const send = async (plan: Planned): Promise<Blobs> => {
    const out: Blobs = {}
    for (const u of plan.uploads) {
      out[u.format] = (await uploadBlob(client, u.uri, u.mime)).blob
    }
    return out
  }
  const inlineBlobs = await send(inline)
  const stickerBlobs = sticker ? await send(sticker) : undefined

  try {
    await client.call(com.atproto.repo.createRecord, {
      repo: did,
      collection: BLUEMOJI_ITEM_COLLECTION,
      rkey,
      // Not a lexicon this app ships, so there is nothing to validate against.
      validate: false,
      record: buildItemRecord({
        alias,
        alt,
        adultOnly,
        ...provenance,
        inline: inlineBlobs,
        sticker: stickerBlobs,
        createdAt: new Date().toISOString(),
      }),
    })
  } catch (e) {
    /*
     * Rendering and uploading take a while; another device may have claimed the
     * alias in the meantime. Rather than depend on the PDS's exact error code
     * for a duplicate rkey, look again. The blobs uploaded above are left for
     * the PDS to garbage-collect.
     */
    if (await recordExists(client, did, rkey).catch(() => false)) {
      throw new BluemojiUploadError('alias-taken', `:${alias}: already exists`)
    }
    throw e
  }
  return {
    rkey,
    animationDropped: inline.animationDropped || !!sticker?.animationDropped,
  }
}
