import {useEffect, useMemo, useRef} from 'react'
import {useQueryClient} from '@tanstack/react-query'

import {useSession} from '#/state/session'
import {useEmojiSearch} from '#/components/Autocomplete/useAutocomplete/useEmojiSearch'
import {normalizeAlias} from '../alias'
import {type BluemojiItemView} from '../types'
import {BluemojiNode} from './BluemojiNode'
import {buildAliasMap, loadCollection, searchItems} from './collectionIndex'
import {createBluemojiSuggestion} from './suggestion'

/**
 * The composer's Bluemoji support: a TipTap extension that turns finished
 * `:alias:` text into an image and offers `:` completions, plus `find` for
 * code (the picker) that wants to look an emoji up synchronously.
 *
 * The extension is stable for the life of the account, so the editor is not
 * rebuilt as the collection loads. It reads the latest collection through a
 * ref instead.
 */
export function useBluemojiEditor() {
  const queryClient = useQueryClient()
  const did = useSession().currentAccount?.did
  const emojiSearch = useEmojiSearch()
  const aliases = useRef(new Map<string, BluemojiItemView>())

  // Warm the collection as soon as the composer mounts, so the first `:` is fast.
  useEffect(() => {
    if (!did) return
    let cancelled = false
    loadCollection(queryClient, did).then(
      items => {
        if (!cancelled) aliases.current = buildAliasMap(items)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [queryClient, did])

  return useMemo(() => {
    const find = (name: string) => {
      try {
        return aliases.current.get(normalizeAlias(name))
      } catch {
        return undefined
      }
    }
    const searchBluemoji = async (query: string, limit: number) => {
      if (!did) return []
      const items = await loadCollection(queryClient, did)
      aliases.current = buildAliasMap(items)
      return searchItems(items, query, limit)
    }
    const searchUnicode = async (query: string, limit: number) =>
      (await emojiSearch(query, limit)).map(e => ({
        id: e.emoji.id,
        native: e.value,
      }))
    return {
      find,
      extension: BluemojiNode.configure({
        find,
        suggestion: createBluemojiSuggestion({searchBluemoji, searchUnicode}),
      }),
    }
  }, [queryClient, did, emojiSearch])
}
