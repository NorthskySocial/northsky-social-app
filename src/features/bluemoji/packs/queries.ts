import {useEffect, useMemo} from 'react'
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {usePdsClient, useSession} from '#/state/session'
import {normalizeAlias} from '../alias'
import {getActorPacksPage, getPackPage} from '../api'
import {useInvalidateBluemoji, useMyBluemoji} from '../queries'
import {type BluemojiItemView} from '../types'
import {type PackInput, type PackListPage, type PackPage} from './types'
import {
  addToPack,
  createPack,
  deletePack,
  installItem,
  installPack,
  removeFromPack,
  updatePack,
} from './write'

const PACK_ROOT = 'bluemoji-pack'
const PACKS_ROOT = 'bluemoji-packs'

/** The AppView learns of a write from the firehose, so a read right after one can be stale. */
const INDEX_LAG_MS = 1500

/** Pack views poll while the AppView has not indexed a just-created pack. */
const PENDING_POLL_MS = 2000
const PENDING_MAX_POLLS = 8

/**
 * One pack and its items. `data.pages[0]` is `null` while the AppView has not
 * seen the pack yet (just created, or a bad link); it polls a few times before
 * settling, so a new pack appears without a manual refresh.
 */
export function usePackQuery(uri: string) {
  return useInfiniteQuery<
    PackPage | null,
    Error,
    InfiniteData<PackPage | null>,
    readonly unknown[],
    string | undefined
  >({
    staleTime: STALE.MINUTES.ONE,
    queryKey: createQueryKey(PACK_ROOT, {uri}),
    queryFn: ({pageParam, signal}) =>
      getPackPage({uri, cursor: pageParam, signal}),
    initialPageParam: undefined,
    getNextPageParam: last => last?.cursor,
    refetchInterval: query => {
      const missing = query.state.data?.pages[0] === null
      return missing && query.state.dataUpdateCount < PENDING_MAX_POLLS
        ? PENDING_POLL_MS
        : false
    },
  })
}

/** The signed-in user's packs. */
export function useMyPacks() {
  const did = useSession().currentAccount?.did
  return useInfiniteQuery<
    PackListPage,
    Error,
    InfiniteData<PackListPage>,
    readonly unknown[],
    string | undefined
  >({
    enabled: !!did,
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: createQueryKey(PACKS_ROOT, {did: did ?? ''}),
    queryFn: ({pageParam, signal}) =>
      getActorPacksPage({actor: did!, cursor: pageParam, signal}),
    initialPageParam: undefined,
    getNextPageParam: last => last.cursor,
  })
}

/**
 * Every emoji in the user's collection, paged in the background. Packs need
 * the whole list: to know which aliases are taken, and to pick from.
 */
export function useAllMyBluemoji() {
  const query = useMyBluemoji()
  const {hasNextPage, isFetchingNextPage, fetchNextPage, data} = query
  const pageCount = data?.pages.length ?? 0
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pageCount < 20) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, pageCount, fetchNextPage])

  const items = useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data])
  const aliases = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      try {
        set.add(normalizeAlias(item.name))
      } catch {}
    }
    return set
  }, [items])
  return {
    items,
    aliases,
    isPending: query.isPending,
    isLoadingMore: !!hasNextPage,
  }
}

function useInvalidatePacks() {
  const queryClient = useQueryClient()
  const invalidateBluemoji = useInvalidateBluemoji()
  return () => {
    const run = () => {
      void queryClient.invalidateQueries({
        predicate: ({queryKey}) =>
          queryKey[0] === PACK_ROOT || queryKey[0] === PACKS_ROOT,
      })
      invalidateBluemoji()
    }
    run()
    setTimeout(run, INDEX_LAG_MS)
  }
}

function useWriteContext() {
  const client = usePdsClient()
  const {currentAccount} = useSession()
  return {client, did: currentAccount!.did}
}

export function useCreatePack() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: (input: PackInput) => createPack(ctx.client, ctx.did, input),
    onSuccess: invalidate,
  })
}

export function useUpdatePack(packUri: string) {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: (changes: Partial<PackInput>) =>
      updatePack(ctx.client, ctx.did, packUri, changes),
    onSuccess: invalidate,
  })
}

export function useDeletePack() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: (packUri: string) => deletePack(ctx.client, ctx.did, packUri),
    onSuccess: invalidate,
  })
}

export function useAddToPack() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: ({packUri, itemUris}: {packUri: string; itemUris: string[]}) =>
      Promise.all(
        itemUris.map(itemUri =>
          addToPack(ctx.client, ctx.did, packUri, itemUri),
        ),
      ),
    onSuccess: invalidate,
  })
}

export function useRemoveFromPack() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: (packItemUri: string) =>
      removeFromPack(ctx.client, ctx.did, packItemUri),
    onSuccess: invalidate,
  })
}

export function useInstallItem() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: ({
      source,
      renameTo,
    }: {
      source: BluemojiItemView
      renameTo?: string
    }) => installItem({...ctx, source, renameTo}),
    onSuccess: invalidate,
  })
}

export function useInstallPack() {
  const ctx = useWriteContext()
  const invalidate = useInvalidatePacks()
  return useMutation({
    mutationFn: (args: {
      items: BluemojiItemView[]
      haveAliases: ReadonlySet<string>
      onProgress?: (done: number, total: number) => void
    }) => installPack({...ctx, ...args}),
    onSuccess: invalidate,
  })
}
