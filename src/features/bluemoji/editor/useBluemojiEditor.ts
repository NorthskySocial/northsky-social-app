import {useEffect, useMemo, useRef} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {type Editor} from '@tiptap/core'

import {useSession} from '#/state/session'
import {useEmojiSearch} from '#/components/Autocomplete/useAutocomplete/useEmojiSearch'
import {useAdultEmojiVisible} from '../adultPref'
import {normalizeAlias} from '../alias'
import {COLLECTION_INDEX_ROOT} from '../queryKeys'
import {type BluemojiItemView} from '../types'
import {BluemojiNode} from './BluemojiNode'
import {buildAliasMap, loadCollection, searchItems} from './collectionIndex'
import {createBluemojiSuggestion, type SuggestionController} from './suggestion'
import {lookupVisible, stripAdultNodes, visibleItems} from './visibility'

/**
 * The composer's Bluemoji support: a TipTap extension that turns finished
 * `:alias:` text into an image and offers `:` completions, plus `find` for
 * code (the picker) that wants to look an emoji up synchronously, and
 * `closePopup` for the composer's popup-first Escape.
 *
 * The extension is stable for the life of the account, so the editor is not
 * rebuilt as the collection loads or settings change. It reads the latest
 * collection and the adult-emoji setting through refs instead.
 */
export function useBluemojiEditor() {
  const queryClient = useQueryClient()
  const did = useSession().currentAccount?.did
  const emojiSearch = useEmojiSearch()
  const adultVisible = useAdultEmojiVisible()
  const aliases = useRef(new Map<string, BluemojiItemView>())
  const adultVisibleRef = useRef(adultVisible)
  const controller = useRef<SuggestionController>({close: () => false})

  useEffect(() => {
    adultVisibleRef.current = adultVisible
  }, [adultVisible])

  /*
   * Keep the alias map in step with the shared collection index: warm it as
   * soon as the composer mounts so the first `:` is fast, pick up a fresh copy
   * whenever it loads, and re-fetch when something is written (an upload or an
   * edit invalidates it) so a just-added emoji works without reopening.
   */
  useEffect(() => {
    if (!did) return
    let cancelled = false
    const load = () =>
      loadCollection(queryClient, did).then(
        items => {
          if (!cancelled) aliases.current = buildAliasMap(items)
        },
        () => {},
      )
    void load()
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (
        event.type === 'updated' &&
        event.action.type === 'invalidate' &&
        (event.query.queryKey as readonly unknown[])[0] ===
          COLLECTION_INDEX_ROOT
      ) {
        void load()
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [queryClient, did])

  return useMemo(() => {
    const find = (name: string) => {
      try {
        return lookupVisible(
          aliases.current,
          normalizeAlias(name),
          adultVisibleRef.current,
        )
      } catch {
        return undefined
      }
    }
    const searchBluemoji = async (query: string, limit: number) => {
      if (!did) return []
      const items = await loadCollection(queryClient, did)
      aliases.current = buildAliasMap(items)
      return searchItems(
        visibleItems(items, adultVisibleRef.current),
        query,
        limit,
      )
    }
    const searchUnicode = async (query: string, limit: number) =>
      (await emojiSearch(query, limit)).map(e => ({
        id: e.emoji.id,
        native: e.value,
      }))
    return {
      find,
      /** Hides the completion popup if it is open; true if it was. */
      closePopup: () => controller.current.close(),
      extension: BluemojiNode.configure({
        find,
        suggestion: createBluemojiSuggestion({
          searchBluemoji,
          searchUnicode,
          controller: controller.current,
        }),
      }),
    }
  }, [queryClient, did, emojiSearch])
}

/**
 * If adult-only emoji stop being allowed while the composer is open, take the
 * ones already in the draft back to their `:alias:` text.
 */
export function useHideAdultEmojiInEditor(editor: Editor | null) {
  const adultVisible = useAdultEmojiVisible()
  useEffect(() => {
    if (editor && !adultVisible) stripAdultNodes(editor)
  }, [editor, adultVisible])
}
