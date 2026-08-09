import {type ComponentType} from 'react'
import {type StyleProp, type ViewStyle} from 'react-native'
import {type AppBskyEmbedExternal} from '@atproto/api'

export type CustomEmbedComponentProps = {
  view: AppBskyEmbedExternal.ViewExternal
  onOpen?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * northsky: a client-side custom embed handler.
 *
 * Some records are shared as ordinary links rather than as their own embed
 * type - a Tangled snippet arrives as an `app.bsky.embed.external` card
 * pointing at tangled.org. A handler decides whether it recognizes the link
 * (via `match`) and, if so, supplies a component to render it richly.
 *
 * This sits *beside* upstream's external embed rendering rather than replacing
 * it: unmatched links fall through untouched. It is distinct from
 * `#/features/customRecords`, which keys off an embed's `$type` for records
 * upstream classifies as unknown.
 */
export type CustomEmbedHandler = {
  id: string
  match: (view: AppBskyEmbedExternal.ViewExternal) => boolean
  Component: ComponentType<CustomEmbedComponentProps>
}
