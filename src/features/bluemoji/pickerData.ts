import {useEffect} from 'react'

import {bluemojiImageUrl, pickInlineCid} from './api'
import {useMyBluemoji} from './queries'

/** Pagination stops here; a picker is not the place to page through thousands. */
const MAX_PAGES = 6

/** `custom` category shape consumed by emoji-mart's `Picker`. */
export type EmojiMartCustomCategory = {
  id: string
  name: string
  emojis: {
    id: string
    name: string
    keywords: string[]
    skins: {src: string}[]
  }[]
}

export const BLUEMOJI_CATEGORY_ID = 'bluemoji'

/**
 * The signed-in user's Bluemoji as an emoji-mart custom category, which the
 * picker renders as its own tab. `undefined` while disabled, loading, or when
 * the user has nothing usable, so the tab only appears when it has content.
 *
 * Emoji marked `adultOnly` are left out: renderers show those as plain text,
 * so offering them here would insert something that never displays as an image.
 */
export function useBluemojiPickerCategory(enabled: boolean): {
  category: EmojiMartCustomCategory | undefined
  iconSrc: string | undefined
} {
  const query = useMyBluemoji('', {enabled})
  const {hasNextPage, isFetchingNextPage, fetchNextPage, data} = query

  const pageCount = data?.pages.length ?? 0
  useEffect(() => {
    if (
      enabled &&
      hasNextPage &&
      !isFetchingNextPage &&
      pageCount < MAX_PAGES
    ) {
      void fetchNextPage()
    }
  }, [enabled, hasNextPage, isFetchingNextPage, pageCount, fetchNextPage])

  if (!enabled || !data) return {category: undefined, iconSrc: undefined}

  const emojis: EmojiMartCustomCategory['emojis'] = []
  for (const item of data.pages.flatMap(p => p.items)) {
    const cid = pickInlineCid(item.formats)
    if (!cid || item.adultOnly) continue
    const alias = item.name.replace(/^:|:$/g, '')
    emojis.push({
      id: alias,
      name: item.alt || alias,
      keywords: [alias],
      skins: [{src: bluemojiImageUrl(item.did, cid)}],
    })
  }
  if (!emojis.length) return {category: undefined, iconSrc: undefined}

  return {
    category: {id: BLUEMOJI_CATEGORY_ID, name: 'Bluemoji', emojis},
    iconSrc: emojis[0].skins[0].src,
  }
}
