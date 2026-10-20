import {
  type Editor,
  InputRule,
  mergeAttributes,
  Node,
  type Range,
} from '@tiptap/core'
import {PluginKey} from '@tiptap/pm/state'
import Suggestion, {type SuggestionOptions} from '@tiptap/suggestion'

import {bluemojiImageUrl, pickInlineCid} from '../api'
import {type BluemojiItemView} from '../types'

export const BLUEMOJI_NODE = 'bluemoji'

/** `:alias:` as it ends the text before the cursor. */
const CLOSED_ALIAS = /(?:^|\s)(:[^\s:]{1,64}:)$/

export type BluemojiNodeOptions = {
  /** Sync lookup against the already-loaded collection. */
  find: (name: string) => BluemojiItemView | undefined
  /** Popup rendering and item search for the `:` trigger. */
  suggestion: Omit<SuggestionOptions, 'editor'>
}

export function nodeAttrsFor(item: BluemojiItemView) {
  // A still keeps the composer calm; the posted emoji animates where it renders.
  const cid = pickInlineCid(item.formats, {animate: false})
  return {
    name: item.name,
    alt: item.alt ?? item.name,
    src: cid ? bluemojiImageUrl(item.did, cid) : null,
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bluemoji: {
      /** Insert a Bluemoji node (and a trailing space) at the selection. */
      insertBluemoji: (item: BluemojiItemView) => ReturnType
    }
  }
}

/**
 * An inline, atomic image standing in for `:alias:` while composing. The
 * document text it serialises to is still the colon-wrapped alias, so posting
 * is unchanged: facets are built from that text at publish time, against the
 * author's collection (see `attachBluemojiFacets`).
 *
 * Typing `:` plus a character opens a suggestion popup, and finishing a
 * `:alias:` that exists in the collection swaps it for the image.
 */
export const BluemojiNode = Node.create<BluemojiNodeOptions>({
  name: BLUEMOJI_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      find: () => undefined,
      suggestion: {
        char: ':',
        pluginKey: new PluginKey('bluemojiSuggestion'),
      } as Omit<SuggestionOptions, 'editor'>,
    }
  },

  addAttributes() {
    return {
      name: {default: null},
      alt: {default: null},
      src: {default: null},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-bluemoji]',
        getAttrs: el => ({
          name: el.getAttribute('data-bluemoji'),
          alt: el.getAttribute('alt'),
          src: el.getAttribute('src'),
        }),
      },
    ]
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        'data-bluemoji': node.attrs.name,
        src: node.attrs.src,
        alt: node.attrs.alt,
        draggable: 'false',
        class: 'bluemoji',
        style:
          'height:1.3em;width:1.3em;vertical-align:middle;object-fit:contain',
      }),
    ]
  },

  // Used by getText and the clipboard serialiser.
  renderText({node}) {
    return node.attrs.name ?? ''
  },

  addCommands() {
    return {
      insertBluemoji:
        item =>
        ({commands}) =>
          commands.insertContent([
            {type: this.name, attrs: nodeAttrsFor(item)},
            {type: 'text', text: ' '},
          ]),
    }
  },

  addInputRules() {
    const {find} = this.options
    const type = this.type
    return [
      new InputRule({
        find: CLOSED_ALIAS,
        handler: ({state, range, match}) => {
          const typed = match[1]
          const item = find(typed)
          // Unknown aliases stay as the text the user typed.
          if (!item) return null
          const attrs = nodeAttrsFor(item)
          if (!attrs.src) return null
          // The closing colon is the character being typed and is not in the
          // document yet, so the range runs from the opening colon to the caret.
          const from = range.from + (match[0].length - typed.length)
          state.tr.replaceWith(from, range.to, type.create(attrs))
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: Range
          props: {item: BluemojiItemView} | {native: string}
        }) => {
          if ('item' in props) {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {type: BLUEMOJI_NODE, attrs: nodeAttrsFor(props.item)},
                {type: 'text', text: ' '},
              ])
              .run()
          } else {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [{type: 'text', text: props.native}])
              .run()
          }
        },
      }),
    ]
  },
})
