import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {describeError} from './errors'
import {type PackInput} from './types'

const NAME_MAX = 64
const DESCRIPTION_MAX = 300

/** Create a pack, or edit one (pass `initial`). */
export function PackFormDialog({
  control,
  initial,
  onSubmit,
}: {
  control: Dialog.DialogControlProps
  initial?: PackInput
  onSubmit: (input: PackInput) => Promise<unknown>
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Body control={control} initial={initial} onSubmit={onSubmit} />
    </Dialog.Outer>
  )
}

function Body({
  control,
  initial,
  onSubmit,
}: {
  control: Dialog.DialogControlProps
  initial?: PackInput
  onSubmit: (input: PackInput) => Promise<unknown>
}) {
  const {t: l} = useLingui()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [adultOnly, setAdultOnly] = useState(initial?.adultOnly ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const canSubmit = !!name.trim() && !busy
  const editing = !!initial

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onSubmit({name, description, adultOnly})
      control.close()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.ScrollableInner label={editing ? l`Edit pack` : l`Create a pack`}>
      <View style={[a.gap_lg]}>
        <Text style={[a.text_lg, a.font_semi_bold]}>
          {editing ? <Trans>Edit pack</Trans> : <Trans>Create a pack</Trans>}
        </Text>
        <View>
          <TextField.LabelText>
            <Trans>Name</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <Dialog.Input
              label={l`Pack name`}
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
            />
          </TextField.Root>
        </View>
        <View>
          <TextField.LabelText>
            <Trans>Description</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <Dialog.Input
              label={l`Pack description`}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={DESCRIPTION_MAX}
            />
          </TextField.Root>
        </View>
        <Toggle.Item
          type="checkbox"
          name="pack-adult"
          label={l`Mark as adult content`}
          value={adultOnly}
          onChange={setAdultOnly}>
          <Toggle.Checkbox />
          <Toggle.LabelText>
            <Trans>Mark as adult content</Trans>
          </Toggle.LabelText>
        </Toggle.Item>
        {error ? <Admonition type="error">{error}</Admonition> : null}
        <Button
          label={editing ? l`Save pack` : l`Create pack`}
          size="large"
          color="primary"
          variant="solid"
          disabled={!canSubmit}
          onPress={submit}>
          <ButtonText>
            {editing ? <Trans>Save</Trans> : <Trans>Create pack</Trans>}
          </ButtonText>
          {busy ? <ButtonIcon icon={Loader} /> : null}
        </Button>
      </View>
    </Dialog.ScrollableInner>
  )
}
