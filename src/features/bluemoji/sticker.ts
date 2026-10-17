import {blobCid} from './api'
import {type BluemojiBlobValue, type BluemojiItemView} from './types'

export const STICKER_EMBED_TYPE = 'blue.moji.embed.sticker'

const STICKER_KEYS = ['apng_512', 'gif_512', 'webp_512', 'png_512'] as const
const STICKER_STILL_KEYS = [
  'png_512',
  'webp_512',
  'gif_512',
  'apng_512',
] as const

/** Same idea as `pickInlineCid`, for the 512px sticker renditions. */
export function pickStickerCid(
  stickerFormats: Record<string, BluemojiBlobValue> | undefined,
  {animate = true}: {animate?: boolean} = {},
): string | undefined {
  if (!stickerFormats) return undefined
  for (const key of animate ? STICKER_KEYS : STICKER_STILL_KEYS) {
    const cid = blobCid(stickerFormats[key])
    if (cid) return cid
  }
  return undefined
}

/** Whether an item has any sticker rendition a client here can draw. */
export function isStickerCapable(item: BluemojiItemView): boolean {
  return !!pickStickerCid(item.stickerFormats)
}

/** `blue.moji.embed.sticker` as written into a post record. Self-attested. */
export type StickerEmbed = {
  $type: typeof STICKER_EMBED_TYPE
  sticker: {
    did: string
    name: string
    alt?: string
    record?: {uri: string; cid: string}
    formats: Record<string, string>
  }
}

/**
 * The embed for a post, built from a verified item. `record` is the strong ref
 * that renderers use as their verification anchor.
 */
export function buildStickerEmbed(item: BluemojiItemView): StickerEmbed {
  const formats: Record<string, string> = {
    $type: 'blue.moji.embed.sticker#formats_v0',
  }
  for (const key of STICKER_STILL_KEYS) {
    const cid = blobCid(item.stickerFormats?.[key])
    if (cid) formats[key] = cid
  }
  return {
    $type: STICKER_EMBED_TYPE,
    sticker: {
      did: item.did,
      name: item.name,
      ...(item.alt ? {alt: item.alt} : {}),
      ...(item.cid ? {record: {uri: item.uri, cid: item.cid}} : {}),
      formats,
    },
  }
}

/** The sticker embed in a post record, if the post has one. */
export function parseStickerEmbed(
  record: unknown,
): StickerEmbed['sticker'] | undefined {
  const embed = (record as {embed?: Partial<StickerEmbed>} | undefined)?.embed
  if (embed?.$type !== STICKER_EMBED_TYPE) return undefined
  const s = embed.sticker
  if (!s || typeof s.did !== 'string' || typeof s.name !== 'string') {
    return undefined
  }
  return s
}
