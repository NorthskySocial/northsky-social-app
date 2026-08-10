/**
 * Tangled string links look like:
 *   https://tangled.org/strings/{actor}/{rkey}
 * (also tangled.sh) where {actor} is the owner (handle or DID) and {rkey} is
 * the rkey of their `sh.tangled.string` record. The DID form contains colons
 * but never a slash, so the `[^/]+` actor group captures it intact.
 *
 * The rkey must end the path: a deeper URL is some other page, not the snippet
 * this card renders.
 */
const TANGLED_STRING_RE =
  /^https?:\/\/tangled\.(?:org|sh)\/strings\/([^/]+)\/([^/?#]+)\/?(?:[?#].*)?$/i

export type TangledStringRef = {
  /** Handle or DID of the owner, taken verbatim from the URL. */
  actor: string
  rkey: string
}

export function parseTangledString(url: string): TangledStringRef | null {
  const match = TANGLED_STRING_RE.exec(url)
  if (!match) return null
  const [, actor, rkey] = match
  if (!actor || !rkey) return null
  // This runs during render via the embed registry, so a malformed escape must
  // not throw - fall through to the default link card instead.
  let decoded: string
  try {
    decoded = decodeURIComponent(actor)
  } catch {
    return null
  }
  // The regex accepts the actor as one path segment, but decoding can put a
  // separator back: `alice%2Fother` becomes `alice/other`, which is not an
  // actor. Reject it here rather than let the registry claim the link and
  // start a query that can only fail.
  if (decoded.includes('/')) return null
  return {actor: decoded, rkey}
}

export function isTangledStringUrl(url: string): boolean {
  return parseTangledString(url) !== null
}
