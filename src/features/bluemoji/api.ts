import {aliasToRkey} from './alias'
import {BLUEMOJI_APPVIEW} from './constants'
import {type PackListPage, type PackPage} from './packs/types'
import {
  type BluemojiBlobValue,
  type BluemojiFormats,
  type BluemojiItemView,
} from './types'

/**
 * Same-origin-cacheable image URL. All Bluemoji images go through the
 * AppView's proxy rather than hot-linking PDS `getBlob` URLs.
 */
export function bluemojiImageUrl(did: string, cid: string): string {
  return `${BLUEMOJI_APPVIEW}/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`
}

/**
 * The CID inside a rendition value, whichever shape it came in. `itemView`
 * returns blob refs rather than bare strings, so code that only accepted
 * strings would silently render nothing.
 */
export function blobCid(
  value: BluemojiBlobValue | undefined,
): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (!value || typeof value !== 'object') return undefined
  const cid = value.ref?.$link ?? value.$link ?? value.cid
  return typeof cid === 'string' && cid ? cid : undefined
}

const ANIMATED_FIRST = ['apng_128', 'gif_128', 'webp_128', 'png_128'] as const
const STILL_FIRST = ['png_128', 'webp_128', 'gif_128', 'apng_128'] as const

/**
 * The CID to show inline. Only blob-backed renditions are rendered; the
 * deprecated v0 `apng_128`/`lottie` are booleans with no CID, and Lottie needs
 * a player this app does not ship, so those fall back to another rendition or
 * to the text alias.
 *
 * With `animate` (the default) animated renditions win; without it, a still
 * is preferred so users who turn animation off are not shown moving images.
 * Items that only have an animated rendition still show it either way, since
 * a still of it does not exist.
 */
export function pickInlineCid(
  formats: BluemojiFormats,
  {animate = true}: {animate?: boolean} = {},
): string | undefined {
  for (const key of animate ? ANIMATED_FIRST : STILL_FIRST) {
    const cid = blobCid(formats[key])
    if (cid) return cid
  }
  return undefined
}

export async function xrpcGet<T>(
  nsid: string,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<{status: number; body: T | undefined}> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v))
  }
  const res = await fetch(`${BLUEMOJI_APPVIEW}/xrpc/${nsid}?${qs}`, {signal})
  if (res.status === 404 || res.status === 400) {
    return {status: res.status, body: undefined}
  }
  if (!res.ok) throw new Error(`${nsid} failed: ${res.status}`)
  return {status: res.status, body: (await res.json()) as T}
}

/**
 * Verified lookup of one emoji by owner + alias, via
 * `blue.moji.collection.getItem`. Facet claims are self-attested by the
 * poster, so rendering must always go through this rather than the facet's
 * own `formats` / `adultOnly`.
 *
 * Resolves to `null` when the emoji does not exist (or the alias is invalid),
 * and throws on transport failure so callers can retry.
 */
export async function getBluemojiItem(
  repo: string,
  alias: string,
  signal?: AbortSignal,
): Promise<BluemojiItemView | null> {
  try {
    aliasToRkey(alias)
  } catch {
    return null
  }
  const {body} = await xrpcGet<{item: BluemojiItemView}>(
    'blue.moji.collection.getItem',
    {repo, name: alias},
    signal,
  )
  return body?.item ?? null
}

export type BluemojiPage = {items: BluemojiItemView[]; cursor?: string}

/**
 * One page of a user's own collection. With a query it uses substring
 * `searchItems`; without, `listCollection` newest-first.
 */
export async function listBluemoji({
  repo,
  q,
  cursor,
  limit = 50,
  signal,
}: {
  repo: string
  q?: string
  cursor?: string
  limit?: number
  signal?: AbortSignal
}): Promise<BluemojiPage> {
  const query = q?.trim()
  const {body} = query
    ? await xrpcGet<BluemojiPage>(
        'blue.moji.collection.searchItems',
        {q: query.slice(0, 100), repo, limit, cursor},
        signal,
      )
    : await xrpcGet<BluemojiPage>(
        'blue.moji.collection.listCollection',
        {repo, limit, cursor, reverse: 'true'},
        signal,
      )
  return body ?? {items: []}
}

/** One page of a pack's items, via `blue.moji.packs.getPack`. */
export async function getPackPage({
  uri,
  cursor,
  limit = 100,
  signal,
}: {
  uri: string
  cursor?: string
  limit?: number
  signal?: AbortSignal
}): Promise<PackPage | null> {
  const {body} = await xrpcGet<PackPage>(
    'blue.moji.packs.getPack',
    {pack: uri, cursor, limit},
    signal,
  )
  return body ?? null
}

/** One page of a user's packs, via `blue.moji.packs.getActorPacks`. */
export async function getActorPacksPage({
  actor,
  cursor,
  limit = 50,
  signal,
}: {
  actor: string
  cursor?: string
  limit?: number
  signal?: AbortSignal
}): Promise<PackListPage> {
  const {body} = await xrpcGet<PackListPage>(
    'blue.moji.packs.getActorPacks',
    {actor, cursor, limit},
    signal,
  )
  return body ?? {packs: []}
}
