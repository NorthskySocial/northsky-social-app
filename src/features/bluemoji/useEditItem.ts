import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {usePdsClient, useSession} from '#/state/session'
import {type BluemojiPage} from './api'
import {deleteItem, type ItemChanges, rkeyOfItem, updateItem} from './edit'
import {useInvalidateBluemoji} from './queries'
import {COLLECTION_ROOT} from './queryKeys'
import {type BluemojiItemView} from './types'

/** How long the AppView typically needs to learn of a write from the firehose. */
const INDEX_LAG_MS = 4000

type Collection = InfiniteData<BluemojiPage>

/**
 * The collection lists come from the AppView, which learns of a write from the
 * firehose a moment later; refetching straight away would just show the old
 * value again. So the cached lists are patched at once, and refetched after
 * the AppView has had time to catch up.
 */
function usePatchCollection() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBluemoji()
  return (patch: (items: BluemojiItemView[]) => BluemojiItemView[]) => {
    queryClient.setQueriesData<Collection>(
      {predicate: ({queryKey}) => queryKey[0] === COLLECTION_ROOT},
      data =>
        data && {
          ...data,
          pages: data.pages.map(p => ({...p, items: patch(p.items)})),
        },
    )
    setTimeout(invalidate, INDEX_LAG_MS)
  }
}

export function useEditItem() {
  const client = usePdsClient()
  const did = useSession().currentAccount?.did
  const patchCollection = usePatchCollection()

  return useMutation({
    mutationFn: ({
      item,
      changes,
    }: {
      item: BluemojiItemView
      changes: ItemChanges
    }) =>
      // `item.cid` is the version the form was opened on.
      updateItem(client, did!, rkeyOfItem(item.uri), changes, {
        expectedCid: item.cid,
      }),
    onSuccess: ({cid}, {item, changes}) =>
      patchCollection(items =>
        items.map(i => {
          if (i.uri !== item.uri) return i
          // Only what changed; the rest of the cached item is still right. The
          // new CID matters: it is the baseline the next edit is checked against.
          const next: BluemojiItemView = {...i, cid}
          if (changes.alt !== undefined)
            next.alt = changes.alt.trim() || undefined
          if (changes.adultOnly !== undefined)
            next.adultOnly = changes.adultOnly
          if (changes.license !== undefined) {
            next.license = changes.license.trim() || undefined
          }
          if (changes.source !== undefined) {
            next.source = changes.source.trim() || undefined
          }
          return next
        }),
      ),
  })
}

export function useDeleteItem() {
  const client = usePdsClient()
  const did = useSession().currentAccount?.did
  const patchCollection = usePatchCollection()

  return useMutation({
    mutationFn: (item: BluemojiItemView) =>
      deleteItem(client, did!, rkeyOfItem(item.uri)),
    onSuccess: (_data, item) =>
      patchCollection(items => items.filter(i => i.uri !== item.uri)),
  })
}
