/**
 * The Bluemoji AppView. It indexes `blue.moji.collection.item` records from
 * the firehose, which makes it the trust anchor for verifying facets, and it
 * serves the same-origin-cached `/img/{did}/{cid}` blob proxy.
 */
export const BLUEMOJI_APPVIEW = 'https://moji.blue'

/** Inline renditions are 128px; the blob limit is 128kB (`blob_v1`). */
export const INLINE_SIZE = 128
export const INLINE_MAX_BYTES = 128_000

/** Sticker renditions are 512px; the blob limit is 512kB (`blob_sticker`). */
export const STICKER_SIZE = 512
export const STICKER_MAX_BYTES = 512_000
