import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {EmojiTile} from './EmojiTile'
import {describeError} from './errors'
import {useAddToPack, useAllMyBluemoji} from './queries'

/**
 * Pick emoji from the user's collection to add to a pack. Emoji already in the
 * pack are not offered.
 */
export function PickEmojiDialog({
  control,
  packUri,
  inPackUris,
}: {
  control: Dialog.DialogControlProps
  packUri: string
  /** AT-URIs of the item records the pack already contains. */
  inPackUris: ReadonlySet<string>
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Body control={control} packUri={packUri} inPackUris={inPackUris} />
    </Dialog.Outer>
  )
}

function Body({
  control,
  packUri,
  inPackUris,
}: {
  control: Dialog.DialogControlProps
  packUri: string
  inPackUris: ReadonlySet<string>
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {items, isPending, isLoadingMore} = useAllMyBluemoji()
  const {mutateAsync: add, isPending: isAdding} = useAddToPack()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>()

  const available = items.filter(i => !inPackUris.has(i.uri))

  const toggle = (uri: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uri)) next.delete(uri)
      else next.add(uri)
      return next
    })

  const onAdd = async () => {
    setError(undefined)
    try {
      await add({packUri, itemUris: [...selected]})
      Toast.show(l`Added ${selected.size} to the pack`)
      control.close()
    } catch (e) {
      setError(describeError(e))
    }
  }

  return (
    <Dialog.ScrollableInner label={l`Add emoji to this pack`}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_lg, a.font_semi_bold]}>
          <Trans>Add emoji to this pack</Trans>
        </Text>
        {isPending ? (
          <View style={[a.align_center, a.py_xl]}>
            <Loader size="xl" />
          </View>
        ) : available.length ? (
          <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
            {available.map(item => (
              <Button
                key={item.uri}
                label={l`Select ${item.name}`}
                accessibilityHint={
                  selected.has(item.uri) ? l`Selected` : l`Not selected`
                }
                onPress={() => toggle(item.uri)}
                style={[
                  a.rounded_md,
                  selected.has(item.uri) && {
                    borderWidth: 2,
                    borderColor: t.palette.primary_500,
                  },
                ]}>
                <EmojiTile
                  item={item}
                  badge={selected.has(item.uri) ? l`Selected` : undefined}
                />
              </Button>
            ))}
          </View>
        ) : (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>
              Everything in your collection is already in this pack.
            </Trans>
          </Text>
        )}
        {isLoadingMore ? <Loader size="sm" /> : null}
        {error ? <Admonition type="error">{error}</Admonition> : null}
        <Button
          label={l`Add selected emoji`}
          size="large"
          color="primary"
          variant="solid"
          disabled={!selected.size || isAdding}
          onPress={onAdd}>
          <ButtonText>
            <Trans>Add {selected.size} selected</Trans>
          </ButtonText>
          {isAdding ? <ButtonIcon icon={Loader} /> : null}
        </Button>
      </View>
    </Dialog.ScrollableInner>
  )
}
