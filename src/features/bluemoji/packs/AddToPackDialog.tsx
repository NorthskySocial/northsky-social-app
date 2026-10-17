import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {getPackPage} from '../api'
import {type BluemojiItemView} from '../types'
import {describeError} from './errors'
import {useAddToPack, useMyPacks} from './queries'

/** Pages to scan when checking whether a pack already holds an emoji. */
const MAX_PAGES = 10

async function packContains(packUri: string, itemUri: string) {
  let cursor: string | undefined
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getPackPage({uri: packUri, cursor})
    if (!page) return false
    if (page.items.some(it => it.subject.uri === itemUri)) return true
    cursor = page.cursor
    if (!cursor) return false
  }
  return false
}

/** Puts an emoji from the user's collection into one of their packs. */
export function AddToPackDialog({
  control,
  item,
}: {
  control: Dialog.DialogControlProps
  item: BluemojiItemView
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Body control={control} item={item} />
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
  const {data, isPending, isError, hasNextPage, fetchNextPage} = useMyPacks()
  const {mutateAsync: add} = useAddToPack()
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()

  const packs = data?.pages.flatMap(p => p.packs) ?? []

  const onChoose = async (packUri: string, packName: string) => {
    setBusy(packUri)
    setError(undefined)
    try {
      // The AppView ignores duplicate memberships, but they would still be
      // written to the repo, so skip them here.
      if (await packContains(packUri, item.uri)) {
        Toast.show(l`${item.name} is already in ${packName}`)
      } else {
        await add({packUri, itemUris: [item.uri]})
        Toast.show(l`Added ${item.name} to ${packName}`)
      }
      control.close()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Dialog.ScrollableInner label={l`Add to a pack`}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_lg, a.font_semi_bold]}>
          <Trans>Add {item.name} to a pack</Trans>
        </Text>
        {isPending ? (
          <View style={[a.align_center, a.py_xl]}>
            <Loader size="xl" />
          </View>
        ) : isError ? (
          <Admonition type="error">
            <Trans>Could not load your packs.</Trans>
          </Admonition>
        ) : packs.length ? (
          packs.map(pack => (
            <Button
              key={pack.uri}
              label={l`Add to ${pack.name}`}
              color="secondary"
              variant="solid"
              size="large"
              disabled={!!busy}
              onPress={() => onChoose(pack.uri, pack.name)}>
              <ButtonText>{pack.name}</ButtonText>
              {busy === pack.uri ? <Loader size="sm" /> : null}
            </Button>
          ))
        ) : (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>
              You have no packs yet. Create one under Settings, Bluemoji, Packs.
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
        {error ? <Admonition type="error">{error}</Admonition> : null}
      </View>
    </Dialog.ScrollableInner>
  )
}
