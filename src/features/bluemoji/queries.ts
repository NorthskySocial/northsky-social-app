import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useSession} from '#/state/session'
import {normalizeAlias} from './alias'
import {type BluemojiPage, getBluemojiItem, listBluemoji} from './api'
import {CircuitOpenError} from './requestGate'
import {type BluemojiItemView} from './types'

/*
 * Cache by (did, canonical alias) so `:Cat:` and `:cat:` share an entry, and
 * keep misses too: a post full of a missing emoji must not refetch per render.
 */
export const itemQueryKey = (did: string, alias: string) =>
  createQueryKey('bluemoji-item', {did, alias: safeAlias(alias)})

const collectionQueryKey = (did: string, q: string) =>
  createQueryKey('bluemoji-collection', {did, q})

export const COLLECTION_ROOT = 'bluemoji-collection'

function safeAlias(alias: string) {
  try {
    return normalizeAlias(alias)
  } catch {
    return alias
  }
}

/*
 * An emoji record changes rarely, so a found one is trusted for a couple of
 * hours; the real freshness bound is the edge cache in front of the AppView. A
 * miss is remembered only briefly so a just-uploaded emoji shows up soon.
 */
const FOUND_STALE = 2 * STALE.HOURS.ONE
const MISSING_STALE = STALE.MINUTES.FIVE
const itemStaleTime = (query: {state: {data: unknown}}) =>
  query.state.data === null ? MISSING_STALE : FOUND_STALE

/** Verified lookup of an emoji for rendering. `null` data means it does not exist. */
export function useBluemojiItem(did: string, name: string) {
  return useQuery({
    queryKey: itemQueryKey(did, name),
    queryFn: ({signal}) => getBluemojiItem(did, name, signal),
    staleTime: itemStaleTime,
    gcTime: 24 * STALE.HOURS.ONE,
    // The request gate already backs off; do not multiply its traffic.
    retry: (count, error) => count < 1 && !(error instanceof CircuitOpenError),
  })
}

/** For the post pipeline, which runs outside React render. */
export function fetchBluemojiItem(
  queryClient: QueryClient,
  did: string,
  name: string,
): Promise<BluemojiItemView | null> {
  return queryClient.fetchQuery({
    queryKey: itemQueryKey(did, name),
    queryFn: ({signal}) => getBluemojiItem(did, name, signal),
    staleTime: STALE.MINUTES.FIVE,
  })
}

/** The signed-in user's own collection, optionally filtered by `q`. */
export function useMyBluemoji(q: string = '', {enabled = true} = {}) {
  const did = useSession().currentAccount?.did
  return useInfiniteQuery<
    BluemojiPage,
    Error,
    InfiniteData<BluemojiPage>,
    readonly unknown[],
    string | undefined
  >({
    enabled: enabled && !!did,
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: collectionQueryKey(did ?? '', q),
    queryFn: ({pageParam, signal}) =>
      listBluemoji({repo: did!, q, cursor: pageParam, signal}),
    initialPageParam: undefined,
    getNextPageParam: last => last.cursor,
  })
}

/** Call after writing a new emoji so the picker and renderers see it. */
export function useInvalidateBluemoji() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({
      predicate: ({queryKey}) =>
        queryKey[0] === COLLECTION_ROOT || queryKey[0] === 'bluemoji-item',
    })
  }
}
