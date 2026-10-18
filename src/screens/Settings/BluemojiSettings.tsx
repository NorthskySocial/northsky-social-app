// northsky: manage and upload Bluemoji custom emoji and stickers
import {useState} from 'react'
import {View} from 'react-native'
import {Image} from 'expo-image'
import {Trans, useLingui} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {openPicker} from '#/lib/media/picker'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {isNetworkError} from '#/lib/strings/errors'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {EmojiArc_Stroke2_Corner0_Rounded as EmojiIcon} from '#/components/icons/Emoji'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {aliasToRkey, normalizeAlias} from '#/features/bluemoji/alias'
import {bluemojiImageUrl, pickInlineCid} from '#/features/bluemoji/api'
import {EditEmojiDialog} from '#/features/bluemoji/EditEmojiDialog'
import {AddToPackDialog} from '#/features/bluemoji/packs/AddToPackDialog'
import {PacksSection} from '#/features/bluemoji/packs/PacksSection'
import {
  ProvenanceFields,
  provenanceProblem,
} from '#/features/bluemoji/ProvenanceFields'
import {useMyBluemoji} from '#/features/bluemoji/queries'
import {type BluemojiItemView as BluemojiItem} from '#/features/bluemoji/types'
import {BluemojiUploadError} from '#/features/bluemoji/upload'
import {useUploadBluemoji} from '#/features/bluemoji/useUploadBluemoji'
import * as SettingsList from './components/SettingsList'

type Picked = {uri: string; width: number; height: number; mime: string}

type Props = NativeStackScreenProps<CommonNavigatorParams, 'BluemojiSettings'>
export function BluemojiSettingsScreen({}: Props) {
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Bluemoji</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Group contentContainerStyle={[a.gap_md]}>
            <SettingsList.ItemIcon icon={EmojiIcon} />
            <SettingsList.ItemText>
              <Trans>Add a custom emoji</Trans>
            </SettingsList.ItemText>
            <UploadForm />
          </SettingsList.Group>
          <SettingsList.Divider />
          <SettingsList.Group contentContainerStyle={[a.gap_md]}>
            <SettingsList.ItemIcon icon={EmojiIcon} />
            <SettingsList.ItemText>
              <Trans>Packs</Trans>
            </SettingsList.ItemText>
            <PacksSection />
          </SettingsList.Group>
          <SettingsList.Divider />
          <SettingsList.Group contentContainerStyle={[a.gap_md]}>
            <SettingsList.ItemIcon icon={EmojiIcon} />
            <SettingsList.ItemText>
              <Trans>Your collection</Trans>
            </SettingsList.ItemText>
            <Collection />
          </SettingsList.Group>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}

function UploadForm() {
  const t = useTheme()
  const {t: l} = useLingui()
  const {mutateAsync: upload, isPending} = useUploadBluemoji()

  const [picked, setPicked] = useState<Picked>()
  const [alias, setAlias] = useState('')
  const [alt, setAlt] = useState('')
  const [asSticker, setAsSticker] = useState(false)
  const [adultOnly, setAdultOnly] = useState(false)
  const [license, setLicense] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [error, setError] = useState<string>()

  let aliasError: string | undefined
  if (alias.trim()) {
    try {
      // the rkey rules are stricter than the alias rules
      aliasToRkey(alias)
    } catch (e) {
      aliasError = e instanceof Error ? e.message : l`Invalid name`
    }
  }
  const provenanceBad = !!provenanceProblem(license, sourceUrl)
  const canSubmit =
    !!picked && !!alias.trim() && !aliasError && !provenanceBad && !isPending

  const onPick = async () => {
    setError(undefined)
    const [image] = await openPicker({aspect: [1, 1]})
    if (image) {
      setPicked({
        uri: image.path,
        width: image.width,
        height: image.height,
        mime: image.mime,
      })
    }
  }

  const onSubmit = async () => {
    if (!picked) return
    setError(undefined)
    try {
      const {animationDropped} = await upload({
        source: picked,
        alias,
        alt,
        asSticker,
        adultOnly,
        license,
        sourceUrl,
      })
      Toast.show(
        animationDropped
          ? l`Added :${normalizeAlias(alias)}: as a still. The animation was too large to keep.`
          : l`Added :${normalizeAlias(alias)}:`,
      )
      setPicked(undefined)
      setAlias('')
      setAlt('')
      setAsSticker(false)
      setAdultOnly(false)
      setLicense('')
      setSourceUrl('')
    } catch (e) {
      if (e instanceof BluemojiUploadError) {
        setError(
          e.code === 'alias-taken'
            ? l`You already have an emoji with that name.`
            : e.code === 'too-large'
              ? l`That image is too detailed. Try a simpler or smaller one.`
              : e.message,
        )
      } else if (isNetworkError(e)) {
        setError(l`Could not reach the network. Check your connection.`)
      } else {
        setError(l`Something went wrong uploading that emoji.`)
      }
    }
  }

  return (
    <View style={[a.gap_md, a.w_full]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Custom emoji appear inline in your posts when you type their name
          between colons, like :blobcat:. Images are cropped to a square.
        </Trans>
      </Text>

      <View style={[a.flex_row, a.align_center, a.gap_md]}>
        <Button
          label={picked ? l`Choose a different image` : l`Choose an image`}
          size="small"
          color="secondary"
          variant="solid"
          onPress={onPick}
          disabled={isPending}>
          <ButtonIcon icon={PlusIcon} />
          <ButtonText>
            {picked ? <Trans>Change image</Trans> : <Trans>Choose image</Trans>}
          </ButtonText>
        </Button>
        {picked ? (
          <Image
            source={{uri: picked.uri}}
            accessibilityIgnoresInvertColors
            alt=""
            contentFit="cover"
            style={[
              a.rounded_sm,
              t.atoms.bg_contrast_25,
              {width: 48, height: 48},
            ]}
          />
        ) : null}
      </View>

      <View>
        <TextField.LabelText>
          <Trans>Name</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={!!aliasError}>
          <TextField.Input
            label={l`Name`}
            placeholder={l`blobcat`}
            value={alias}
            onChangeText={setAlias}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={66}
          />
        </TextField.Root>
        {aliasError ? (
          <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
            {aliasError}
          </Text>
        ) : null}
      </View>

      <View>
        <TextField.LabelText>
          <Trans>Description</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <TextField.Input
            label={l`Description`}
            placeholder={l`Describe the image for people using screen readers`}
            value={alt}
            onChangeText={setAlt}
            maxLength={300}
          />
        </TextField.Root>
      </View>

      <Toggle.Item
        type="checkbox"
        name="sticker"
        label={l`Also make this a sticker`}
        value={asSticker}
        onChange={setAsSticker}>
        <Toggle.Checkbox />
        <Toggle.LabelText>
          <Trans>Also make this a sticker (stored at 512px)</Trans>
        </Toggle.LabelText>
      </Toggle.Item>

      <Toggle.Item
        type="checkbox"
        name="adult-only"
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
        source={sourceUrl}
        onLicenseChange={setLicense}
        onSourceChange={setSourceUrl}
      />

      {error ? <Admonition type="error">{error}</Admonition> : null}

      <Button
        label={l`Add emoji`}
        size="large"
        color="primary"
        variant="solid"
        disabled={!canSubmit}
        onPress={onSubmit}>
        <ButtonText>
          <Trans>Add emoji</Trans>
        </ButtonText>
        {isPending ? <ButtonIcon icon={Loader} /> : null}
      </Button>
    </View>
  )
}

function Collection() {
  const t = useTheme()
  const {t: l} = useLingui()
  const {
    data,
    isPending,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMyBluemoji()
  const addToPackControl = Dialog.useDialogControl()
  const [packTarget, setPackTarget] = useState<BluemojiItem>()
  const editControl = Dialog.useDialogControl()
  const [editTarget, setEditTarget] = useState<BluemojiItem>()

  if (isPending) {
    return (
      <View style={[a.w_full, a.align_center, a.py_xl]}>
        <Loader size="xl" />
      </View>
    )
  }
  if (isError) {
    return (
      <Admonition type="error">
        <Trans>Could not load your collection.</Trans>
      </Admonition>
    )
  }

  const items = data.pages.flatMap(p => p.items)
  if (!items.length) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>You have not added any custom emoji yet.</Trans>
      </Text>
    )
  }

  return (
    <View style={[a.w_full, a.gap_md]}>
      <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
        {items.map(item => {
          const cid = pickInlineCid(item.formats, {animate: false})
          return (
            <View
              key={item.uri}
              style={[a.align_center, a.gap_xs, {width: 72}]}>
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
                style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {item.name}
              </Text>
              {item.stickerFormats ? (
                <Text style={[a.text_2xs, t.atoms.text_contrast_low]}>
                  {l`sticker`}
                </Text>
              ) : null}
              <Button
                label={l`Edit ${item.name}`}
                size="tiny"
                color="secondary"
                variant="solid"
                onPress={() => {
                  setEditTarget(item)
                  editControl.open()
                }}>
                <ButtonText>
                  <Trans>Edit</Trans>
                </ButtonText>
              </Button>
              <Button
                label={l`Add ${item.name} to a pack`}
                size="tiny"
                color="secondary"
                variant="solid"
                onPress={() => {
                  setPackTarget(item)
                  addToPackControl.open()
                }}>
                <ButtonText>
                  <Trans>Add to pack</Trans>
                </ButtonText>
              </Button>
            </View>
          )
        })}
      </View>
      {editTarget ? (
        <EditEmojiDialog control={editControl} item={editTarget} />
      ) : null}
      {packTarget ? (
        <AddToPackDialog control={addToPackControl} item={packTarget} />
      ) : null}
      {hasNextPage ? (
        <Button
          label={l`Load more`}
          size="small"
          color="secondary"
          variant="solid"
          disabled={isFetchingNextPage}
          onPress={() => fetchNextPage()}>
          <ButtonText>
            <Trans>Load more</Trans>
          </ButtonText>
        </Button>
      ) : null}
    </View>
  )
}
