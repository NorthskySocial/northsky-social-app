import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {aliasToRkey, normalizeAlias} from '../alias'
import {type BluemojiItemView} from '../types'
import {EmojiTile} from './EmojiTile'
import {describeError} from './errors'
import {useInstallItem} from './queries'

/**
 * Installs one emoji from a pack into the user's collection, with the chance to
 * rename it first: the alias is the record key, so two emoji with the same
 * name cannot coexist, and a pack's name for something may not be the one the
 * user wants.
 */
export function InstallItemDialog({
  control,
  item,
  haveAliases,
}: {
  control: Dialog.DialogControlProps
  item: BluemojiItemView
  haveAliases: ReadonlySet<string>
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Body control={control} item={item} haveAliases={haveAliases} />
    </Dialog.Outer>
  )
}

function Body({
  control,
  item,
  haveAliases,
}: {
  control: Dialog.DialogControlProps
  item: BluemojiItemView
  haveAliases: ReadonlySet<string>
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {mutateAsync: install, isPending} = useInstallItem()
  const [alias, setAlias] = useState(item.name.replace(/^:|:$/g, ''))
  const [error, setError] = useState<string>()

  let problem: string | undefined
  try {
    aliasToRkey(alias)
    if (haveAliases.has(normalizeAlias(alias))) {
      problem = l`You already have an emoji with this name.`
    }
  } catch (e) {
    problem = e instanceof Error ? e.message : l`Invalid name`
  }

  const onInstall = async () => {
    setError(undefined)
    try {
      await install({source: item, renameTo: alias})
      Toast.show(l`Added :${normalizeAlias(alias)}: to your collection`)
      control.close()
    } catch (e) {
      setError(describeError(e))
    }
  }

  return (
    <Dialog.ScrollableInner label={l`Add to your collection`}>
      <View style={[a.gap_lg]}>
        <Text style={[a.text_lg, a.font_semi_bold]}>
          <Trans>Add to your collection</Trans>
        </Text>
        <View style={[a.align_start]}>
          <EmojiTile item={item} />
        </View>
        <View>
          <TextField.LabelText>
            <Trans>Save as</Trans>
          </TextField.LabelText>
          <TextField.Root isInvalid={!!problem}>
            <Dialog.Input
              label={l`Name`}
              value={alias}
              onChangeText={setAlias}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={66}
            />
          </TextField.Root>
          {problem ? (
            <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
              {problem}
            </Text>
          ) : null}
        </View>
        {error ? <Admonition type="error">{error}</Admonition> : null}
        <Button
          label={l`Add emoji`}
          size="large"
          color="primary"
          variant="solid"
          disabled={!!problem || isPending}
          onPress={onInstall}>
          <ButtonText>
            <Trans>Add emoji</Trans>
          </ButtonText>
          {isPending ? <ButtonIcon icon={Loader} /> : null}
        </Button>
      </View>
    </Dialog.ScrollableInner>
  )
}
