import {Keyboard} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Image_Stroke2_Corner2_Rounded as StickerIcon} from '#/components/icons/Image'
import {StickerPickerDialog} from './StickerPickerDialog'
import {type BluemojiItemView} from './types'

/** Composer toolbar button that attaches a Bluemoji sticker to the post. */
export function SelectStickerBtn({
  onSelectSticker,
  disabled,
}: {
  onSelectSticker: (item: BluemojiItemView) => void
  disabled?: boolean
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  const control = Dialog.useDialogControl()

  return (
    <>
      <Button
        testID="openStickerBtn"
        onPress={() => {
          Keyboard.dismiss()
          control.open()
        }}
        label={l`Add sticker`}
        accessibilityHint={l`Opens your Bluemoji stickers`}
        style={a.p_sm}
        variant="ghost"
        shape="round"
        color="primary"
        disabled={disabled}>
        <StickerIcon size="lg" style={disabled && t.atoms.text_contrast_low} />
      </Button>
      <StickerPickerDialog
        control={control}
        onSelectSticker={onSelectSticker}
      />
    </>
  )
}
