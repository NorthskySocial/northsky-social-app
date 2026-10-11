import {SaveFormat} from 'expo-image-manipulator'
import {type BlobRef, type Client} from '@atproto/lex'
import {type AtIdentifierString} from '@atproto/syntax'

import {uploadBlob} from '#/lib/api/upload-blob'
import {renderImage} from '#/lib/media/image-manipulator'
import {getUriSize} from '#/lib/media/uriSize'
import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {com} from '#/lexicons'
import {aliasToRkey, normalizeAlias} from './alias'
import {
  INLINE_MAX_BYTES,
  INLINE_SIZE,
  STICKER_MAX_BYTES,
  STICKER_SIZE,
} from './constants'
import {BLUEMOJI_ITEM_COLLECTION} from './types'

export type UploadErrorCode = 'alias-taken' | 'too-large' | 'invalid-alias'

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
}

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
async function renderWithinLimit(
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

type ItemRecordInput = {
  alias: string
  alt: string
  adultOnly: boolean
  inline: {format: Rendition['format']; blob: BlobRef}
  sticker?: {format: Rendition['format']; blob: BlobRef}
  createdAt: string
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
      [`${input.inline.format}_128`]: input.inline.blob,
    },
    ...(input.sticker
      ? {
          stickerFormats: {
            $type: 'blue.moji.collection.item#stickerFormats_v0',
            [`${input.sticker.format}_512`]: input.sticker.blob,
          },
        }
      : {}),
    ...(input.adultOnly ? {adultOnly: true} : {}),
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
}

/** Resizes, uploads and records one Bluemoji. Returns the new record's rkey. */
export async function uploadBluemojiItem({
  client,
  did,
  source,
  alias,
  alt,
  asSticker,
  adultOnly,
}: UploadParams): Promise<string> {
  let rkey: string
  try {
    rkey = aliasToRkey(alias)
  } catch (e) {
    throw new BluemojiUploadError(
      'invalid-alias',
      e instanceof Error ? e.message : 'Invalid name',
    )
  }

  // The rkey is the alias, so writing would silently replace an existing emoji.
  const exists = await client
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
  if (exists) {
    throw new BluemojiUploadError('alias-taken', `:${alias}: already exists`)
  }

  const inline = await renderWithinLimit(source, INLINE_SIZE, INLINE_MAX_BYTES)
  const sticker = asSticker
    ? await renderWithinLimit(source, STICKER_SIZE, STICKER_MAX_BYTES)
    : undefined

  const inlineBlob = (
    await uploadBlob(client, inline.uri, `image/${inline.format}`)
  ).blob
  const stickerBlob = sticker
    ? (await uploadBlob(client, sticker.uri, `image/${sticker.format}`)).blob
    : undefined

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
      inline: {format: inline.format, blob: inlineBlob},
      sticker:
        sticker && stickerBlob
          ? {format: sticker.format, blob: stickerBlob}
          : undefined,
      createdAt: new Date().toISOString(),
    }),
  })
  return rkey
}
