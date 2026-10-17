import {type RichText} from '@bsky/sdk/richtext'

import {normalizeAlias} from './alias'
import {blobCid} from './api'
import {
  BLUEMOJI_FACET_TYPE,
  type BluemojiFacetFeature,
  type BluemojiFormats,
  type BluemojiItemView,
} from './types'

/**
 * `:alias:` - 1 to 64 non-space, non-colon characters between colons. The
 * negative lookahead keeps clock times like `3:30:45` from matching.
 */
const ALIAS_PATTERN = /:(?!\d+:)([^\s:]{1,64}):/gu

export type AliasMatch = {
  /** Colon-wrapped, as typed */
  name: string
  /** UTF-16 offsets into the source string */
  start: number
  end: number
}

/** Every well-formed `:alias:` in `text`, in order. */
export function findAliases(text: string): AliasMatch[] {
  const out: AliasMatch[] = []
  for (const m of text.matchAll(ALIAS_PATTERN)) {
    try {
      normalizeAlias(m[0])
    } catch {
      continue
    }
    out.push({name: m[0], start: m.index, end: m.index + m[0].length})
  }
  return out
}

/** Facets carry bare CIDs; v0 booleans have none and are dropped. */
function facetFormats(formats: BluemojiFormats) {
  const out: Record<string, string> = {}
  for (const key of [
    'png_128',
    'webp_128',
    'gif_128',
    'apng_128',
    'lottie',
  ] as const) {
    const cid = blobCid(formats[key])
    if (cid) out[key] = cid
  }
  return Object.keys(out).length
    ? {$type: 'blue.moji.richtext.facet#formats_v1', ...out}
    : undefined
}

/**
 * Build the facet feature for a verified item. The values are copied from the
 * AppView's record of the item, not from anything the user typed.
 */
export function facetFeatureForItem(
  item: BluemojiItemView,
): BluemojiFacetFeature | undefined {
  const formats = facetFormats(item.formats)
  if (!formats) return undefined
  return {
    $type: BLUEMOJI_FACET_TYPE,
    did: item.did,
    name: item.name,
    ...(item.alt ? {alt: item.alt} : {}),
    ...(item.adultOnly ? {adultOnly: true} : {}),
    formats,
  }
}

export type ResolveBluemoji = (
  name: string,
) => Promise<BluemojiItemView | null | undefined>

/**
 * Adds a `blue.moji.richtext.facet` for every `:alias:` the resolver knows.
 * Run it after mention/link detection: an alias that falls inside an existing
 * facet (such as the `://host:` of a URL) is left alone, and an alias the
 * resolver does not know stays plain text.
 *
 * Resolver failures degrade to plain text rather than blocking the post.
 */
export async function attachBluemojiFacets(
  rt: RichText,
  resolve: ResolveBluemoji,
): Promise<RichText> {
  const matches = findAliases(rt.text)
  if (!matches.length) return rt

  const unique = [...new Set(matches.map(m => normalizeAlias(m.name)))]
  const resolved = new Map<string, BluemojiItemView | null>()
  await Promise.all(
    unique.map(async alias => {
      try {
        resolved.set(alias, (await resolve(`:${alias}:`)) ?? null)
      } catch {
        resolved.set(alias, null)
      }
    }),
  )

  const existing = rt.facets ?? []
  const added: NonNullable<RichText['facets']> = []
  for (const m of matches) {
    const item = resolved.get(normalizeAlias(m.name))
    const feature = item && facetFeatureForItem(item)
    if (!feature) continue

    const byteStart = rt.unicodeText.utf16IndexToUtf8Index(m.start)
    const byteEnd = rt.unicodeText.utf16IndexToUtf8Index(m.end)
    const overlaps = existing.some(
      f => byteStart < f.index.byteEnd && f.index.byteStart < byteEnd,
    )
    if (overlaps) continue

    added.push({
      $type: 'app.bsky.richtext.facet',
      index: {byteStart, byteEnd},
      features: [
        feature as unknown as NonNullable<
          typeof added
        >[number]['features'][number],
      ],
    })
  }
  if (!added.length) return rt

  /*
   * `segments()` walks facets in order and assumes they do not overlap, so
   * the merged list must be sorted.
   */
  rt.facets = [...existing, ...added].sort(
    (a, b) => a.index.byteStart - b.index.byteStart,
  )
  return rt
}

/** Finds the Bluemoji feature on a facet, if it has one. */
export function getBluemojiFeature(
  facet: {features: readonly {$type?: string}[]} | undefined,
): BluemojiFacetFeature | undefined {
  return facet?.features.find(
    (f): f is BluemojiFacetFeature => f.$type === BLUEMOJI_FACET_TYPE,
  )
}
