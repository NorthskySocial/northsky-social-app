import {type Editor} from '@tiptap/core'

import {type BluemojiItemView} from '../types'
import {BLUEMOJI_NODE} from './BluemojiNode'

/**
 * Emoji their creator marked adult-only follow the same rule in the composer as
 * everywhere else: they are not drawn unless the user's moderation settings
 * allow it (see `useAdultEmojiVisible`). Otherwise typing a matching alias
 * would show an image the rest of the app would refuse to.
 */
export function visibleItems(
  items: BluemojiItemView[],
  adultVisible: boolean,
): BluemojiItemView[] {
  return adultVisible ? items : items.filter(i => !i.adultOnly)
}

/** A synchronous alias lookup that respects the adult-only setting. */
export function lookupVisible(
  aliases: ReadonlyMap<string, BluemojiItemView>,
  canonicalAlias: string,
  adultVisible: boolean,
): BluemojiItemView | undefined {
  const item = aliases.get(canonicalAlias)
  return item?.adultOnly && !adultVisible ? undefined : item
}

/**
 * Turns any adult-only emoji already in the document back into its `:alias:`
 * text. Used when visibility is switched off while the composer is open, so an
 * image that was fine a moment ago is not left on screen. Returns how many were
 * replaced.
 */
export function stripAdultNodes(editor: Editor): number {
  const found: {pos: number; size: number; name: string}[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === BLUEMOJI_NODE && node.attrs.adult) {
      found.push({
        pos,
        size: node.nodeSize,
        name: String(node.attrs.name ?? ''),
      })
    }
  })
  if (!found.length) return 0

  const tr = editor.state.tr
  // Back to front, so earlier positions stay valid as the document changes.
  for (const {pos, size, name} of found.reverse()) {
    tr.replaceWith(pos, pos + size, editor.state.schema.text(name))
  }
  // Not the user's edit: keep it out of the undo history.
  tr.setMeta('addToHistory', false)
  editor.view.dispatch(tr)
  return found.length
}
