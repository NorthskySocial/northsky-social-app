import {aliasToRkey} from './alias'
import {BLUEMOJI_APPVIEW} from './constants'
import {type BluemojiFormats, type BluemojiItemView} from './types'

/**
 * Same-origin-cacheable image URL. All Bluemoji images go through the
 * AppView's proxy rather than hot-linking PDS `getBlob` URLs.
 */
export function bluemojiImageUrl(did: string, cid: string): string {
  return `${BLUEMOJI_APPVIEW}/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`
}

/**
 * The CID to show inline. Only static, blob-backed renditions are rendered;
 * the deprecated v0 `apng_128`/`lottie` are booleans with no CID, so those
 * items fall back to their text alias.
 */
export function pickInlineCid(formats: BluemojiFormats): string | undefined {
  for (const cid of [formats.png_128, formats.webp_128, formats.gif_128]) {
    if (typeof cid === 'string' && cid) return cid
  }
  return undefined
}

async function xrpcGet<T>(
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
