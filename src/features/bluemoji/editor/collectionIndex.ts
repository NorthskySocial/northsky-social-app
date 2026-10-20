import {type QueryClient} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {normalizeAlias} from '../alias'
import {listBluemoji} from '../api'
import {type BluemojiItemView} from '../types'

/** Enough for any realistic personal collection; stops a runaway cursor. */
const MAX_PAGES = 12

const key = (did: string) => createQueryKey('bluemoji-collection-all', {did})

/**
 * The user's whole collection, fetched once and shared. The composer filters
 * this locally on every keystroke instead of asking the AppView, which keeps
 * typing `:` completions off the network entirely.
 */
export function loadCollection(
  queryClient: QueryClient,
  did: string,
): Promise<BluemojiItemView[]> {
  return queryClient.fetchQuery({
    queryKey: key(did),
    staleTime: STALE.MINUTES.FIVE,
    queryFn: async ({signal}) => {
      const out: BluemojiItemView[] = []
      let cursor: string | undefined
      for (let i = 0; i < MAX_PAGES; i++) {
        const page = await listBluemoji({
          repo: did,
          cursor,
          limit: 100,
          signal,
        })
        out.push(...page.items)
        cursor = page.cursor
        if (!cursor) break
      }
      return out
    },
  })
}

export function invalidateCollectionIndex(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    predicate: ({queryKey}) => queryKey[0] === 'bluemoji-collection-all',
  })
}

/** Alias without colons, canonicalised, or undefined if it is not a valid alias. */
function canonical(name: string): string | undefined {
  try {
    return normalizeAlias(name)
  } catch {
    return undefined
  }
}

export function buildAliasMap(items: BluemojiItemView[]) {
  const map = new Map<string, BluemojiItemView>()
  for (const item of items) {
    const alias = canonical(item.name)
    if (alias) map.set(alias, item)
  }
  return map
}

/**
 * Prefix matches rank above substring matches, then alt text matches; each
 * group keeps the collection's order (newest first).
 */
export function searchItems(
  items: BluemojiItemView[],
  query: string,
  limit: number,
): BluemojiItemView[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const prefix: BluemojiItemView[] = []
  const contains: BluemojiItemView[] = []
  const alt: BluemojiItemView[] = []
  for (const item of items) {
    const name = item.name.replace(/^:|:$/g, '').toLowerCase()
    if (name.startsWith(q)) prefix.push(item)
    else if (name.includes(q)) contains.push(item)
    else if (item.alt?.toLowerCase().includes(q)) alt.push(item)
  }
  return [...prefix, ...contains, ...alt].slice(0, limit)
}
