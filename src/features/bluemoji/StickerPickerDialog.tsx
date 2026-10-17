import {View} from 'react-native'
import {Image} from 'expo-image'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {useAdultEmojiVisible} from './adultPref'
import {bluemojiImageUrl} from './api'
import {useMyBluemoji} from './queries'
import {isStickerCapable, pickStickerCid} from './sticker'
import {type BluemojiItemView} from './types'

const TILE = 88

/**
 * Lists the signed-in user's sticker-capable emoji. Plain emoji (no 512px
 * rendition) are not offered: a sticker is drawn at full size, so a 128px
 * image would be blown up.
 */
export function StickerPickerDialog({
  control,
  onSelectSticker,
}: {
  control: Dialog.DialogControlProps
  onSelectSticker: (item: BluemojiItemView) => void
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <PickerBody
        onSelect={item => control.close(() => onSelectSticker(item))}
      />
    </Dialog.Outer>
  )
}

function PickerBody({onSelect}: {onSelect: (item: BluemojiItemView) => void}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const adultVisible = useAdultEmojiVisible()
  const {data, isPending, isError, hasNextPage, fetchNextPage} = useMyBluemoji()

  /*
   * Stickers are chosen from a collection that may be mostly inline emoji, so
   * keep paging until something shows up or the pages run out.
   */
  const items = (data?.pages.flatMap(p => p.items) ?? []).filter(
    i => isStickerCapable(i) && (!i.adultOnly || adultVisible),
  )

  return (
    <Dialog.ScrollableInner label={l`Choose a sticker`}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_lg, a.font_semi_bold]}>
          <Trans>Choose a sticker</Trans>
        </Text>
        {isPending ? (
          <View style={[a.align_center, a.py_xl]}>
            <Loader size="xl" />
          </View>
        ) : isError ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Could not load your stickers.</Trans>
          </Text>
        ) : items.length ? (
          <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
            {items.map(item => {
              const cid = pickStickerCid(item.stickerFormats, {animate: false})
              if (!cid) return null
              return (
                <Button
                  key={item.uri}
                  label={l`Add sticker ${item.name}`}
                  onPress={() => onSelect(item)}
                  style={[
                    a.rounded_md,
                    a.p_xs,
                    t.atoms.bg_contrast_25,
                    {width: TILE, height: TILE},
                  ]}>
                  <Image
                    source={{uri: bluemojiImageUrl(item.did, cid)}}
                    alt={item.alt || item.name}
                    accessibilityIgnoresInvertColors
                    contentFit="contain"
                    style={{width: TILE - 8, height: TILE - 8}}
                  />
                </Button>
              )
            })}
          </View>
        ) : (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>
              You have no stickers yet. Upload an image under Settings, Bluemoji
              and tick "Also make this a sticker".
            </Trans>
          </Text>
        )}
        {hasNextPage ? (
          <Button
            label={l`Load more`}
            size="small"
            color="secondary"
            variant="solid"
            onPress={() => fetchNextPage()}>
            <ButtonText>
              <Trans>Load more</Trans>
            </ButtonText>
          </Button>
        ) : null}
      </View>
    </Dialog.ScrollableInner>
  )
}
