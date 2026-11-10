import {View} from 'react-native'
import {Image} from 'expo-image'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useAdultEmojiVisible} from '../adultPref'
import {bluemojiImageUrl, pickInlineCid} from '../api'
import {type BluemojiItemView} from '../types'

export const TILE_WIDTH = 96

/**
 * One emoji as a grid tile: image, `:alias:`, and room for actions underneath.
 * Adult-only emoji are not drawn unless the user has allowed them in
 * Moderation, matching how they render in posts.
 */
export function EmojiTile({
  item,
  badge,
  children,
}: {
  item: BluemojiItemView
  /** Small caption under the name, e.g. "Installed". */
  badge?: string
  children?: React.ReactNode
}) {
  const t = useTheme()
  const adultVisible = useAdultEmojiVisible()
  const cid =
    !item.adultOnly || adultVisible
      ? pickInlineCid(item.formats, {animate: false})
      : undefined

  return (
    <View
      style={[
        a.align_center,
        a.gap_xs,
        a.p_sm,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        {width: TILE_WIDTH},
      ]}>
      {cid ? (
        <Image
          source={{uri: bluemojiImageUrl(item.did, cid)}}
          alt={item.alt || item.name}
          accessibilityIgnoresInvertColors
          contentFit="contain"
          style={{width: 48, height: 48}}
        />
      ) : (
        <View style={{width: 48, height: 48}} />
      )}
      <Text
        numberOfLines={1}
        style={[a.text_xs, a.font_medium, t.atoms.text_contrast_high]}>
        {item.name}
      </Text>
      {badge ? (
        <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>{badge}</Text>
      ) : null}
      {children}
    </View>
  )
}
