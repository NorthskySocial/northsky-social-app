import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {PackFormDialog} from './PackFormDialog'
import {useCreatePack, useMyPacks} from './queries'
import {rkeyOf} from './types'

/**
 * The user's packs, and a way to start a new one. A pack opens on its own
 * screen, which is also where it is shared and where other people install it.
 */
export function PacksSection() {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const did = useSession().currentAccount?.did
  const {data, isPending, isError, hasNextPage, fetchNextPage} = useMyPacks()
  const {mutateAsync: create} = useCreatePack()
  const createControl = Dialog.useDialogControl()

  const open = (packUri: string) =>
    navigation.navigate('BluemojiPack', {name: did!, rkey: rkeyOf(packUri)})

  const packs = data?.pages.flatMap(p => p.packs) ?? []

  return (
    <View style={[a.w_full, a.gap_md]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Packs are shareable groups of emoji. Anyone can add a whole pack, or
          just the emoji they like, to their own collection.
        </Trans>
      </Text>
      {isPending ? (
        <Loader size="xl" />
      ) : isError ? (
        <Admonition type="error">
          <Trans>Could not load your packs.</Trans>
        </Admonition>
      ) : (
        packs.map(pack => (
          <Button
            key={pack.uri}
            label={l`Open pack ${pack.name}`}
            color="secondary"
            variant="solid"
            size="large"
            onPress={() => open(pack.uri)}>
            <ButtonText>
              {pack.name}
              {pack.itemCount != null ? ` (${pack.itemCount})` : ''}
            </ButtonText>
          </Button>
        ))
      )}
      {hasNextPage ? (
        <Button
          label={l`Load more packs`}
          size="small"
          color="secondary"
          variant="solid"
          onPress={() => fetchNextPage()}>
          <ButtonText>
            <Trans>Load more</Trans>
          </ButtonText>
        </Button>
      ) : null}
      <Button
        label={l`Create a pack`}
        size="small"
        color="primary"
        variant="solid"
        onPress={createControl.open}>
        <ButtonText>
          <Trans>Create a pack</Trans>
        </ButtonText>
      </Button>
      <PackFormDialog
        control={createControl}
        onSubmit={async input => {
          const uri = await create(input)
          open(uri)
        }}
      />
    </View>
  )
}
