import {type QueryClient} from '@tanstack/react-query'

export const COLLECTION_ROOT = 'bluemoji-collection'

/** The whole-collection index the composer filters locally (see `editor/collectionIndex`). */
export const COLLECTION_INDEX_ROOT = 'bluemoji-collection-all'

/** How long the AppView typically needs to learn of a write from the firehose. */
const REFRESH_DELAYS_MS = [1500, 5000]

const isBluemojiKey = ({queryKey}: {queryKey: readonly unknown[]}) =>
  queryKey[0] === COLLECTION_ROOT ||
  queryKey[0] === COLLECTION_INDEX_ROOT ||
  queryKey[0] === 'bluemoji-item'

/**
 * Marks everything derived from the user's collection stale: the lists, the
 * single-item lookups, and the composer's whole-collection index. Runs now and
 * again shortly after, because the AppView learns of a write from the firehose
 * a moment later, so a refetch straight away can still return the old data.
 */
export function invalidateBluemoji(queryClient: QueryClient) {
  const run = () =>
    void queryClient.invalidateQueries({predicate: isBluemojiKey})
  run()
  for (const delay of REFRESH_DELAYS_MS) setTimeout(run, delay)
}
