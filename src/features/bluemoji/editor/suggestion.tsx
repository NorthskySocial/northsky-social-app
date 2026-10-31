import {forwardRef, useEffect, useImperativeHandle, useState} from 'react'
import {Pressable, View} from 'react-native'
import {Image} from 'expo-image'
import {PluginKey} from '@tiptap/pm/state'
import {ReactRenderer} from '@tiptap/react'
import {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion'
import tippy, {type Instance as TippyInstance} from 'tippy.js'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {bluemojiImageUrl, pickInlineCid} from '../api'
import {type BluemojiItemView} from '../types'

export type EmojiSuggestion =
  | {key: string; kind: 'bluemoji'; item: BluemojiItemView}
  | {key: string; kind: 'unicode'; native: string; id: string}

type ListRef = {onKeyDown: (props: SuggestionKeyDownProps) => boolean}

const MAX_BLUEMOJI = 6
const MAX_UNICODE = 4

/**
 * The `:` completion popup. Custom emoji come first, from the user's own
 * collection, then Unicode matches so `:smile` is still useful. It appears as
 * soon as a `:` is followed by any non-space character, and only when
 * something matches, so ordinary colons in prose do not flash an empty box.
 */
export function createBluemojiSuggestion({
  searchBluemoji,
  searchUnicode,
}: {
  searchBluemoji: (query: string, limit: number) => Promise<BluemojiItemView[]>
  searchUnicode: (
    query: string,
    limit: number,
  ) => Promise<{id: string; native: string}[]>
}): Omit<SuggestionOptions, 'editor'> {
  return {
    char: ':',
    pluginKey: new PluginKey('bluemojiSuggestion'),
    allowSpaces: false,

    async items({query}) {
      if (!query) return []
      const [custom, unicode] = await Promise.all([
        searchBluemoji(query, MAX_BLUEMOJI).catch(() => []),
        searchUnicode(query, MAX_UNICODE).catch(() => []),
      ])
      const items: EmojiSuggestion[] = [
        ...custom.map(item => ({
          key: item.uri,
          kind: 'bluemoji' as const,
          item,
        })),
        ...unicode.map(e => ({
          key: `u-${e.id}`,
          kind: 'unicode' as const,
          native: e.native,
          id: e.id,
        })),
      ]
      return items
    },

    render: () => {
      let component: ReactRenderer<ListRef> | undefined
      let popup: TippyInstance[] | undefined

      const sync = (props: SuggestionProps) => {
        if (props.items.length) popup?.[0]?.show()
        else popup?.[0]?.hide()
      }
      const destroy = () => {
        popup?.[0]?.destroy()
        component?.destroy()
        popup = undefined
        component = undefined
      }

      return {
        onStart: props => {
          component = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          })
          if (!props.clientRect) return
          // @ts-expect-error clientRect can return null, tippy does not like that
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: props.items.length > 0,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate: props => {
          component?.updateProps(props)
          if (!props.clientRect) return
          popup?.[0]?.setProps({
            // @ts-expect-error clientRect can return null, tippy does not like that
            getReferenceClientRect: props.clientRect,
          })
          sync(props)
        },
        onKeyDown: props => {
          // With nothing showing, keys belong to the editor.
          if (!popup?.[0]?.state.isVisible) return false
          if (props.event.key === 'Escape') return false
          return component?.ref?.onKeyDown(props) ?? false
        },
        onExit: destroy,
      }
    },
  }
}

const SuggestionList = forwardRef<ListRef, SuggestionProps<EmojiSuggestion>>(
  function SuggestionListImpl({items, command}, ref) {
    const t = useTheme()
    const [selected, setSelected] = useState(0)
    useEffect(() => setSelected(0), [items])

    const choose = (index: number) => {
      const entry = items[index]
      if (!entry) return
      command(
        entry.kind === 'bluemoji' ? {item: entry.item} : {native: entry.native},
      )
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({event}) => {
        if (!items.length) return false
        if (event.key === 'ArrowUp') {
          setSelected((selected + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelected((selected + 1) % items.length)
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          choose(selected)
          return true
        }
        return false
      },
    }))

    return (
      <div className="items">
        <View
          style={[
            t.atoms.border_contrast_low,
            t.atoms.bg,
            a.rounded_sm,
            a.border,
            a.p_xs,
            {width: 260},
          ]}>
          {items.map((entry, index) => (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              onPress={() => choose(index)}
              onPointerEnter={() => setSelected(index)}
              style={[
                selected === index && t.atoms.bg_contrast_25,
                a.flex_row,
                a.align_center,
                a.gap_md,
                a.px_md,
                a.py_xs,
                a.rounded_xs,
              ]}>
              <Glyph entry={entry} />
              <Text style={[a.text_md, a.flex_1]} numberOfLines={1}>
                :{entry.kind === 'bluemoji' ? aliasOf(entry.item) : entry.id}:
              </Text>
            </Pressable>
          ))}
        </View>
      </div>
    )
  },
)

const aliasOf = (item: BluemojiItemView) => item.name.replace(/^:|:$/g, '')

function Glyph({entry}: {entry: EmojiSuggestion}) {
  if (entry.kind === 'unicode') {
    return <Text style={[a.text_xl, a.leading_tight]}>{entry.native}</Text>
  }
  const cid = pickInlineCid(entry.item.formats, {animate: false})
  return cid ? (
    <Image
      source={{uri: bluemojiImageUrl(entry.item.did, cid)}}
      alt={entry.item.alt || entry.item.name}
      contentFit="contain"
      style={{width: 24, height: 24}}
    />
  ) : (
    <View style={{width: 24, height: 24}} />
  )
}
