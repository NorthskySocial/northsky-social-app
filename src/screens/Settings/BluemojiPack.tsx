// northsky: view, share and install a Bluemoji pack, and manage your own
import {useState} from 'react'
import {View} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useResolveDidQuery} from '#/state/queries/resolve-uri'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {normalizeAlias} from '#/features/bluemoji/alias'
import {EmojiTile} from '#/features/bluemoji/packs/EmojiTile'
import {InstallItemDialog} from '#/features/bluemoji/packs/InstallItemDialog'
import {PackFormDialog} from '#/features/bluemoji/packs/PackFormDialog'
import {PickEmojiDialog} from '#/features/bluemoji/packs/PickEmojiDialog'
import {
  useAllMyBluemoji,
  useDeletePack,
  useInstallPack,
  usePackQuery,
  useRemoveFromPack,
  useUpdatePack,
} from '#/features/bluemoji/packs/queries'
import {packShareUrl, packUriFor} from '#/features/bluemoji/packs/types'
import {type InstallOutcome} from '#/features/bluemoji/packs/write'
import {isCopyable, viewProvenance} from '#/features/bluemoji/provenance'
import {ProvenanceLine} from '#/features/bluemoji/ProvenanceLine'
import {type BluemojiItemView} from '#/features/bluemoji/types'

/** Whether the creator's license lets this be copied (RFC 0006). */
function canCopy(item: BluemojiItemView) {
  return isCopyable(viewProvenance(item.license, item.source).license)
}

type Props = NativeStackScreenProps<CommonNavigatorParams, 'BluemojiPack'>

export function BluemojiPackScreen({route}: Props) {
  const {name, rkey} = route.params
  const isDid = name.startsWith('did:')
  const {data: resolved, isError: resolveFailed} = useResolveDidQuery(
    isDid ? undefined : name,
  )
  const did = isDid ? name : resolved

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Emoji pack</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.p_xl, a.gap_lg]}>
          {did ? (
            <PackBody did={did} rkey={rkey} />
          ) : resolveFailed ? (
            <Admonition type="error">
              <Trans>Could not find that account.</Trans>
            </Admonition>
          ) : (
            <Loader size="xl" />
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function PackBody({did, rkey}: {did: string; rkey: string}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const {openComposer} = useOpenComposer()
  const navigation = useNavigation()
  const packUri = packUriFor(did, rkey)

  const query = usePackQuery(packUri)
  const mine = useAllMyBluemoji()
  const {mutateAsync: removeItem} = useRemoveFromPack()
  const {mutateAsync: updatePack} = useUpdatePack(packUri)
  const {mutateAsync: deletePack, isPending: isDeleting} = useDeletePack()
  const {mutateAsync: installAll, isPending: isInstalling} = useInstallPack()

  const installControl = Dialog.useDialogControl()
  const editControl = Dialog.useDialogControl()
  const pickControl = Dialog.useDialogControl()
  const [target, setTarget] = useState<BluemojiItemView>()
  const [progress, setProgress] = useState<[number, number]>()
  const [summary, setSummary] =
    useState<{item: BluemojiItemView; outcome: InstallOutcome}[]>()
  const [error, setError] = useState<string>()

  if (query.isPending) return <Loader size="xl" />
  const first = query.data?.pages[0]
  if (query.isError) {
    return (
      <Admonition type="error">
        <Trans>Could not load this pack.</Trans>
      </Admonition>
    )
  }
  if (!first) {
    // Not indexed yet (a new pack) or not a pack; usePackQuery polls briefly.
    return (
      <View style={[a.gap_sm]}>
        <Loader size="xl" />
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Looking for this pack…</Trans>
        </Text>
      </View>
    )
  }

  const {pack} = first
  const items = query.data.pages.flatMap(p => p?.items ?? [])
  const isOwner = currentAccount?.did === pack.creator.did
  const shareUrl = packShareUrl(did, rkey)
  const inPackUris = new Set(items.map(i => i.subject.uri))
  const toInstall = items
    .map(i => i.subject)
    .filter(s => {
      try {
        return !mine.aliases.has(normalizeAlias(s.name)) && canCopy(s)
      } catch {
        return false
      }
    })

  const onInstallAll = async () => {
    setError(undefined)
    setSummary(undefined)
    setProgress([0, toInstall.length])
    try {
      const results = await installAll({
        items: toInstall,
        haveAliases: mine.aliases,
        onProgress: (done, total) => setProgress([done, total]),
      })
      setSummary(results)
      const added = results.filter(r => r.outcome.status === 'installed').length
      Toast.show(l`Added ${added} emoji to your collection`)
    } catch {
      setError(l`Something went wrong adding this pack.`)
    } finally {
      setProgress(undefined)
    }
  }

  const failed = summary?.filter(r => r.outcome.status === 'failed') ?? []

  return (
    <>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_2xl, a.font_bold]}>{pack.name}</Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            by @{pack.creator.handle} · {items.length} emoji
          </Trans>
        </Text>
        {pack.description ? (
          <Text style={[a.text_md, a.mt_sm]}>{pack.description}</Text>
        ) : null}
        <ProvenanceLine license={pack.license} source={pack.source} />
      </View>

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {!isOwner ? (
          <Button
            label={l`Add all to my collection`}
            size="small"
            color="primary"
            variant="solid"
            disabled={isInstalling || !toInstall.length}
            onPress={onInstallAll}>
            <ButtonText>
              {toInstall.length ? (
                <Trans>Add all ({toInstall.length})</Trans>
              ) : (
                <Trans>Nothing more to add</Trans>
              )}
            </ButtonText>
            {isInstalling ? <ButtonIcon icon={Loader} /> : null}
          </Button>
        ) : null}
        <Button
          label={l`Copy link to this pack`}
          size="small"
          color="secondary"
          variant="solid"
          onPress={async () => {
            await Clipboard.setStringAsync(shareUrl)
            Toast.show(l`Link copied`)
          }}>
          <ButtonText>
            <Trans>Copy link</Trans>
          </ButtonText>
        </Button>
        <Button
          label={l`Share this pack in a post`}
          size="small"
          color="secondary"
          variant="solid"
          onPress={() => openComposer({text: `${pack.name}\n${shareUrl}`})}>
          <ButtonText>
            <Trans>Post it</Trans>
          </ButtonText>
        </Button>
        {isOwner ? (
          <>
            <Button
              label={l`Add emoji to this pack`}
              size="small"
              color="secondary"
              variant="solid"
              onPress={pickControl.open}>
              <ButtonText>
                <Trans>Add emoji</Trans>
              </ButtonText>
            </Button>
            <Button
              label={l`Edit this pack`}
              size="small"
              color="secondary"
              variant="solid"
              onPress={editControl.open}>
              <ButtonText>
                <Trans>Edit</Trans>
              </ButtonText>
            </Button>
            <Button
              label={l`Delete this pack`}
              size="small"
              color="negative_subtle"
              variant="solid"
              disabled={isDeleting}
              onPress={async () => {
                await deletePack(packUri)
                Toast.show(l`Pack deleted`)
                navigation.goBack()
              }}>
              <ButtonText>
                <Trans>Delete</Trans>
              </ButtonText>
            </Button>
          </>
        ) : null}
      </View>

      {progress ? (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>
            Adding {progress[0]} of {progress[1]}…
          </Trans>
        </Text>
      ) : null}
      {summary ? (
        <Admonition type={failed.length ? 'warning' : 'info'}>
          <Trans>
            Added {summary.filter(r => r.outcome.status === 'installed').length}
            , skipped{' '}
            {summary.filter(r => r.outcome.status === 'exists').length} you
            already have
            {failed.length ? `, ${failed.length} failed` : ''}. Add skipped ones
            one at a time to give them a new name.
          </Trans>
        </Admonition>
      ) : null}
      {error ? <Admonition type="error">{error}</Admonition> : null}

      {items.length ? (
        <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
          {items.map(({uri, subject}) => {
            let have = false
            try {
              have = mine.aliases.has(normalizeAlias(subject.name))
            } catch {}
            const copyable = canCopy(subject)
            return (
              <EmojiTile
                key={uri}
                item={subject}
                badge={
                  !isOwner && have
                    ? l`In your collection`
                    : !isOwner && !copyable
                      ? l`Copying not allowed`
                      : undefined
                }>
                {isOwner ? (
                  <Button
                    label={l`Remove ${subject.name} from this pack`}
                    size="tiny"
                    color="secondary"
                    variant="solid"
                    onPress={() => removeItem(uri)}>
                    <ButtonText>
                      <Trans>Remove</Trans>
                    </ButtonText>
                  </Button>
                ) : !have && copyable ? (
                  <Button
                    label={l`Add ${subject.name} to my collection`}
                    size="tiny"
                    color="secondary"
                    variant="solid"
                    onPress={() => {
                      setTarget(subject)
                      installControl.open()
                    }}>
                    <ButtonText>
                      <Trans>Add</Trans>
                    </ButtonText>
                  </Button>
                ) : null}
              </EmojiTile>
            )
          })}
        </View>
      ) : (
        <Text style={t.atoms.text_contrast_medium}>
          {isOwner ? (
            <Trans>
              This pack is empty. Add some emoji from your collection.
            </Trans>
          ) : (
            <Trans>This pack is empty.</Trans>
          )}
        </Text>
      )}

      {query.hasNextPage ? (
        <Button
          label={l`Load more`}
          size="small"
          color="secondary"
          variant="solid"
          disabled={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}>
          <ButtonText>
            <Trans>Load more</Trans>
          </ButtonText>
        </Button>
      ) : null}

      {target ? (
        <InstallItemDialog
          control={installControl}
          item={target}
          haveAliases={mine.aliases}
        />
      ) : null}
      {isOwner ? (
        <>
          <PackFormDialog
            control={editControl}
            initial={{
              name: pack.name,
              description: pack.description,
              license: pack.license,
              source: pack.source,
            }}
            onSubmit={updatePack}
          />
          <PickEmojiDialog
            control={pickControl}
            packUri={packUri}
            inPackUris={inPackUris}
          />
        </>
      ) : null}
    </>
  )
}
