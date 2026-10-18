import {useState} from 'react'
import {View} from 'react-native'
import {Image} from 'expo-image'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {bluemojiImageUrl, pickInlineCid} from './api'
import {describeError} from './packs/errors'
import {ProvenanceFields, provenanceProblem} from './ProvenanceFields'
import {type BluemojiItemView} from './types'
import {useDeleteItem, useEditItem} from './useEditItem'

const ALT_MAX = 300

/**
 * Edit an emoji you own: its description, adult flag, license and source. The
 * name and image stay as they are (see `updateItem`), and it can be deleted
 * from here after a second tap.
 */
export function EditEmojiDialog({
  control,
  item,
}: {
  control: Dialog.DialogControlProps
  item: BluemojiItemView
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      {/* Keyed so reopening on another emoji starts from its own values. */}
      <Body key={item.uri} control={control} item={item} />
    </Dialog.Outer>
  )
}

function Body({
  control,
  item,
}: {
  control: Dialog.DialogControlProps
  item: BluemojiItemView
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {mutateAsync: edit, isPending: isSaving} = useEditItem()
  const {mutateAsync: remove, isPending: isDeleting} = useDeleteItem()

  const [alt, setAlt] = useState(item.alt ?? '')
  const [adultOnly, setAdultOnly] = useState(item.adultOnly ?? false)
  const [license, setLicense] = useState(item.license ?? '')
  const [source, setSource] = useState(item.source ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string>()

  const busy = isSaving || isDeleting
  const cid = pickInlineCid(item.formats, {animate: false})
  const canSave = !provenanceProblem(license, source) && !busy

  const onSave = async () => {
    setError(undefined)
    try {
      await edit({item, changes: {alt, adultOnly, license, source}})
      Toast.show(l`Saved ${item.name}`)
      control.close()
    } catch (e) {
      setError(describeError(e))
    }
  }

  const onDelete = async () => {
    setError(undefined)
    try {
      await remove(item)
      Toast.show(l`Deleted ${item.name}`)
      control.close()
    } catch (e) {
      setError(describeError(e))
    }
  }

  return (
    <Dialog.ScrollableInner label={l`Edit ${item.name}`}>
      <View style={[a.gap_lg]}>
        <View style={[a.flex_row, a.align_center, a.gap_md]}>
          {cid ? (
            <Image
              source={{uri: bluemojiImageUrl(item.did, cid)}}
              alt={item.alt || item.name}
              accessibilityIgnoresInvertColors
              contentFit="contain"
              style={{width: 48, height: 48}}
            />
          ) : null}
          <View style={[a.flex_1]}>
            <Text style={[a.text_lg, a.font_semi_bold]}>{item.name}</Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>
                The name and image can't be changed. To change them, add a new
                emoji.
              </Trans>
            </Text>
          </View>
        </View>

        <View>
          <TextField.LabelText>
            <Trans>Description</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <Dialog.Input
              label={l`Description for screen readers`}
              value={alt}
              onChangeText={setAlt}
              maxLength={ALT_MAX}
            />
          </TextField.Root>
        </View>

        <Toggle.Item
          type="checkbox"
          name="edit-adult"
          label={l`Mark as adult content`}
          value={adultOnly}
          onChange={setAdultOnly}>
          <Toggle.Checkbox />
          <Toggle.LabelText>
            <Trans>Mark as adult content</Trans>
          </Toggle.LabelText>
        </Toggle.Item>

        <ProvenanceFields
          license={license}
          source={source}
          onLicenseChange={setLicense}
          onSourceChange={setSource}
        />

        {error ? <Admonition type="error">{error}</Admonition> : null}

        <Button
          label={l`Save changes`}
          size="large"
          color="primary"
          variant="solid"
          disabled={!canSave}
          onPress={onSave}>
          <ButtonText>
            <Trans>Save</Trans>
          </ButtonText>
          {isSaving ? <ButtonIcon icon={Loader} /> : null}
        </Button>

        {confirmDelete ? (
          <View style={[a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_high]}>
              <Trans>
                Delete {item.name}? Posts that used it will show the :name: text
                instead. Copies other people made are not affected.
              </Trans>
            </Text>
            <View style={[a.flex_row, a.gap_sm]}>
              <Button
                label={l`Yes, delete ${item.name}`}
                size="small"
                color="negative"
                variant="solid"
                disabled={busy}
                onPress={onDelete}>
                <ButtonText>
                  <Trans>Delete</Trans>
                </ButtonText>
                {isDeleting ? <ButtonIcon icon={Loader} /> : null}
              </Button>
              <Button
                label={l`Keep it`}
                size="small"
                color="secondary"
                variant="solid"
                disabled={busy}
                onPress={() => setConfirmDelete(false)}>
                <ButtonText>
                  <Trans>Keep it</Trans>
                </ButtonText>
              </Button>
            </View>
          </View>
        ) : (
          <Button
            label={l`Delete ${item.name}`}
            size="small"
            color="negative_subtle"
            variant="solid"
            disabled={busy}
            onPress={() => setConfirmDelete(true)}>
            <ButtonText>
              <Trans>Delete this emoji</Trans>
            </ButtonText>
          </Button>
        )}
      </View>
    </Dialog.ScrollableInner>
  )
}
