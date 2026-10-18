/*
 * Minimal hand-written types for the `blue.moji.*` lexicons this feature
 * touches. The full generated client is deliberately not vendored: it would
 * add hundreds of files to a fork for four record shapes.
 */

/**
 * A rendition as it appears in the wild: a bare CID string (facets, embeds), a
 * blob ref (`{ref: {$link}}`, which is what the AppView's `itemView` returns),
 * or, in the deprecated v0 shape, a boolean with no CID at all.
 */
export type BluemojiBlobValue =
  string | boolean | {ref?: {$link?: string}; $link?: string; cid?: string}

/** Renditions keyed by format. */
export type BluemojiFormats = {
  $type?: string
  png_128?: BluemojiBlobValue
  webp_128?: BluemojiBlobValue
  gif_128?: BluemojiBlobValue
  apng_128?: BluemojiBlobValue
  lottie?: BluemojiBlobValue
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
  stickerFormats?: Record<string, BluemojiBlobValue>
  adultOnly?: boolean
  /** SPDX expression. Self-asserted; re-validate with `viewProvenance` before use. */
  license?: string
  /** Where it was re-uploaded from. Self-asserted; only ever link `safeHref(source)`. */
  source?: string
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
