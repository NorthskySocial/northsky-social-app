import {View} from 'react-native'
import {Image} from 'expo-image'

import {ExternalEmbedRemoveBtn} from '#/view/com/composer/ExternalEmbedRemoveBtn'
import {atoms as a, useTheme} from '#/alf'
import {bluemojiImageUrl} from './api'
import {pickStickerCid} from './sticker'
import {type BluemojiItemView} from './types'

/** The sticker attached to a post being composed, with a remove button. */
export function StickerDraftPreview({
  item,
  onRemove,
}: {
  item: BluemojiItemView
  onRemove: () => void
}) {
  const t = useTheme()
  const cid = pickStickerCid(item.stickerFormats)
  if (!cid) return null

  return (
    <View style={[a.mt_lg, a.align_start]}>
      <View style={[a.relative, a.rounded_md, a.p_sm, t.atoms.bg_contrast_25]}>
        <Image
          source={{uri: bluemojiImageUrl(item.did, cid)}}
          alt={item.alt || item.name}
          accessibilityIgnoresInvertColors
          contentFit="contain"
          style={{width: 160, height: 160}}
        />
        <ExternalEmbedRemoveBtn onRemove={onRemove} />
      </View>
    </View>
  )
}
