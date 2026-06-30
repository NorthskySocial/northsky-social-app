import {BRAND} from '#/brand/config'
import {type PostInteractionCounts} from './types'

// northsky: service host is configurable via the brand module
export const CONSTELLATION_SERVICE = BRAND.constellationServiceUrl

const TIMEOUT_MS = 5_000

async function constellationFetch(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {Accept: 'application/json'},
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetch the count of backlinks for a given subject and source type.
 * Returns 0 on any error.
 */
async function getBacklinksCount(
  subject: string,
  source: string,
): Promise<number> {
  try {
    const url = `${CONSTELLATION_SERVICE}/xrpc/blue.microcosm.links.getBacklinksCount?subject=${encodeURIComponent(subject)}&source=${encodeURIComponent(source)}`
    const res = await constellationFetch(url)
    if (!res.ok) return 0
    const data = (await res.json()) as {count?: number}
    return data.count ?? 0
  } catch {
    return 0
  }
}

/**
 * Fetch like, repost, reply, and quote counts for a post from Constellation.
 * All four requests are made in parallel. Returns 0 for any that fail.
 */
export async function getPostInteractionCounts(
  postUri: string,
): Promise<PostInteractionCounts> {
  const [likeCount, repostCount, replyCount, quoteCount] = await Promise.all([
    getBacklinksCount(postUri, 'app.bsky.feed.like:subject.uri'),
    getBacklinksCount(postUri, 'app.bsky.feed.repost:subject.uri'),
    getBacklinksCount(postUri, 'app.bsky.feed.post:reply.parent.uri'),
    getBacklinksCount(postUri, 'app.bsky.feed.post:embed.record.uri'),
  ])
  return {likeCount, repostCount, replyCount, quoteCount}
}
