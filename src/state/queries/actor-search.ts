import {
  type InfiniteData,
  keepPreviousData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAppview, useAppviewClient} from '#/state/session'
import {searchProxyOpts} from '#/brand/searchRouting' // northsky: search routing
import {app} from '#/lexicons'

export const RQKEY_ROOT = 'actor-search'
export const RQKEY = (query: string, limit?: number) => [
  RQKEY_ROOT,
  query,
  limit,
]

export function useActorSearch({
  query,
  enabled,
  maintainData,
  limit = 25,
}: {
  query: string
  enabled?: boolean
  maintainData?: boolean
  limit?: number
}) {
  const client = useAppviewClient()
  const appview = useAppview() // northsky: search may be pinned to another appview
  return useInfiniteQuery<
    app.bsky.actor.searchActors.$OutputBody,
    Error,
    InfiniteData<app.bsky.actor.searchActors.$OutputBody>,
    QueryKey,
    string | undefined
  >({
    staleTime: STALE.MINUTES.FIVE,
    // northsky: appended appview so switching accounts does not reuse results
    queryKey: [...RQKEY(query, limit), appview.did],
    queryFn: async ({pageParam}) => {
      return await client.call(
        app.bsky.actor.searchActors,
        {
          q: query,
          limit,
          cursor: pageParam,
        },
        searchProxyOpts(appview), // northsky: appviews without actor search route elsewhere
      )
    },
    enabled: enabled && !!query,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    placeholderData: maintainData ? keepPreviousData : undefined,
    select,
  })
}

function select(data: InfiniteData<app.bsky.actor.searchActors.$OutputBody>) {
  // enforce uniqueness
  const dids = new Set()

  return {
    ...data,
    pages: data.pages.map(page => ({
      actors: page.actors.filter(actor => {
        if (dids.has(actor.did)) {
          return false
        }
        dids.add(actor.did)
        return true
      }),
    })),
  }
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  did: string,
) {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<app.bsky.actor.searchActors.$OutputBody>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) {
      continue
    }
    for (const actor of queryData.pages.flatMap(page => page.actors)) {
      if (actor.did === did) {
        yield actor
      }
    }
  }
}
