import {View} from 'react-native'
import {Image} from 'expo-image'
import {Trans, useLingui} from '@lingui/react/macro'

import {useA11y} from '#/state/a11y'
import {useAutoplayDisabled} from '#/state/preferences'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useAdultEmojiVisible} from './adultPref'
import {bluemojiImageUrl} from './api'
import {useBluemojiItem} from './queries'
import {parseStickerEmbed, pickStickerCid} from './sticker'

const STICKER_DISPLAY_SIZE = 192

/**
 * Renders the `blue.moji.embed.sticker` in a post record.
 *
 * Bluesky's AppView does not hydrate embeds it does not know, so there is no
 * embed view to draw from and this reads the record directly. That makes the
 * embed self-attested by the poster, so nothing is taken from it except which
 * emoji it names: the image, alt text and adult flag come from the verified
 * emoji record, and when the embed carries a strong ref to that record, the
 * looked-up record must be the one it points at. Anything that fails to verify
 * shows the sticker's `:name:` as text.
 */
export function BluemojiSticker({post}: {post: {record: unknown}}) {
  const sticker = parseStickerEmbed(post.record)
  if (!sticker) return null
  return <VerifiedSticker sticker={sticker} />
}

function VerifiedSticker({
  sticker,
}: {
  sticker: NonNullable<ReturnType<typeof parseStickerEmbed>>
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {data: item} = useBluemojiItem(sticker.did, sticker.name)
  const adultVisible = useAdultEmojiVisible()
  const {reduceMotionEnabled} = useA11y()
  const autoplayDisabled = useAutoplayDisabled()

  const matchesRef = !sticker.record || sticker.record.uri === item?.uri
  const cid =
    item && matchesRef
      ? pickStickerCid(item.stickerFormats, {
          animate: !reduceMotionEnabled && !autoplayDisabled,
        })
      : undefined

  if (!item || !cid) {
    return (
      <Text style={[a.mt_xs, t.atoms.text_contrast_medium]}>
        {sticker.name}
      </Text>
    )
  }

  if (item.adultOnly && !adultVisible) {
    return (
      <Text style={[a.mt_xs, a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>Adult-only sticker hidden: {item.name}</Trans>
      </Text>
    )
  }

  return (
    <View style={[a.mt_xs, a.align_start]}>
      <Image
        source={{uri: bluemojiImageUrl(item.did, cid)}}
        alt={item.alt || l`Sticker ${item.name}`}
        accessibilityIgnoresInvertColors
        contentFit="contain"
        cachePolicy="memory-disk"
        style={{width: STICKER_DISPLAY_SIZE, height: STICKER_DISPLAY_SIZE}}
      />
    </View>
  )
}
