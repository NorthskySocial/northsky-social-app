/*
 * Minimal hand-written types for the `blue.moji.*` lexicons this feature
 * touches. The full generated client is deliberately not vendored: it would
 * add hundreds of files to a fork for four record shapes.
 */

/** CIDs keyed by rendition. Deprecated v0 may carry booleans instead of CIDs. */
export type BluemojiFormats = {
  $type?: string
  png_128?: string
  webp_128?: string
  gif_128?: string
  apng_128?: string | boolean
  lottie?: string | boolean
}

/** `blue.moji.collection.item#itemView`, as returned by the AppView. */
export type BluemojiItemView = {
  uri: string
  cid?: string
  did: string
  /** Colon-wrapped alias, e.g. `:blobcat:` */
  name: string
  alt?: string
  formats: BluemojiFormats
  stickerFormats?: Record<string, unknown>
  adultOnly?: boolean
}

/** `blue.moji.richtext.facet` - self-attested, never render from it directly. */
export type BluemojiFacetFeature = {
  $type: 'blue.moji.richtext.facet'
  did: string
  name: string
  alt?: string
  adultOnly?: boolean
  formats: BluemojiFormats
}

export const BLUEMOJI_FACET_TYPE = 'blue.moji.richtext.facet'
export const BLUEMOJI_ITEM_COLLECTION = 'blue.moji.collection.item'
