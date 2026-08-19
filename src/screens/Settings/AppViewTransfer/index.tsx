import {useEffect, useRef, useState} from 'react'
import {View} from 'react-native'
import {XRPCError} from '@atproto/api'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQueryClient} from '@tanstack/react-query'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {logger} from '#/logger'
import {useAgent, useSession} from '#/state/session'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import {ArrowBoxRight_Stroke2_Corner3_Rounded as TransferIcon} from '#/components/icons/ArrowBoxRight'
import {ArrowRotateClockwise_Stroke2_Corner0_Rounded as ProgressIcon} from '#/components/icons/ArrowRotate'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import * as Layout from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import {Text} from '#/components/Typography'
import {
  getTransferEndpoint,
  isTransferEndpointId,
} from '#/features/appViewTransfer/endpoints'
import {
  createTransferCheckpoint,
  runAppViewTransfer,
} from '#/features/appViewTransfer/transfer'
import {
  APP_VIEW_TRANSFER_COLLECTIONS,
  type AppViewTransferCheckpoint,
  type AppViewTransferCollectionId,
  type AppViewTransferCollectionProgress,
  DEFAULT_TRANSFER_COLLECTIONS,
  type TransferEndpointId,
} from '#/features/appViewTransfer/types'
import {account} from '#/storage'
import {EndpointSelector, useEndpointNames} from './EndpointSelector'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'AppViewTransferSettings'
>

export function AppViewTransferSettingsScreen({}: Props) {
  const {t: l} = useLingui()
  const t = useTheme()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const accountDid = currentAccount!.did
  const storedCheckpoint = account.get([accountDid, 'appViewTransfer'])
  const initialCheckpoint =
    storedCheckpoint?.version === 1 &&
    storedCheckpoint.accountDid === accountDid
      ? storedCheckpoint
      : undefined

  const [checkpoint, setCheckpoint] = useState(initialCheckpoint)
  const checkpointRef = useRef(checkpoint)
  const mountedRef = useRef(false)
  const runningRef = useRef(false)
  const lastWriteRef = useRef(0)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const confirmControl = Prompt.usePromptControl()
  const [error, setError] = useState<string>()
  const [sourceId, setSourceId] = useState<TransferEndpointId>(() =>
    isTransferEndpointId(initialCheckpoint?.source.id)
      ? initialCheckpoint.source.id
      : 'bluesky',
  )
  const [destinationId, setDestinationId] = useState<TransferEndpointId>(() =>
    isTransferEndpointId(initialCheckpoint?.destination.id)
      ? initialCheckpoint.destination.id
      : 'blacksky',
  )
  const [selectedCollections, setSelectedCollections] = useState<
    AppViewTransferCollectionId[]
  >(initialCheckpoint?.selectedCollections ?? [...DEFAULT_TRANSFER_COLLECTIONS])

  const endpointNames = useEndpointNames()
  const collectionNames = useCollectionNames()
  const isRunning = checkpoint?.status === 'running'
  const hasFailedCollections = checkpoint?.selectedCollections.some(
    id => checkpoint.collections[id]?.status === 'failed',
  )
  const hasIncompleteCollections = checkpoint?.selectedCollections.some(id =>
    ['failed', 'unsupported'].includes(
      checkpoint.collections[id]?.status ?? 'pending',
    ),
  )

  /*
   * The engine reports progress once per written item, so a large collection
   * would serialize and store the whole checkpoint thousands of times. Cap the
   * write rate while the run continues, and always store a terminal state. A
   * dropped write costs at most one second of progress, and a resume rereads
   * the destination anyway, so no item is written twice.
   */
  const saveCheckpoint = (next: AppViewTransferCheckpoint) => {
    checkpointRef.current = next
    const now = Date.now()
    if (next.status !== 'running' || now - lastWriteRef.current >= 1000) {
      lastWriteRef.current = now
      account.set([accountDid, 'appViewTransfer'], next)
    }
    if (mountedRef.current) setCheckpoint(next)
  }

  useEffect(() => {
    mountedRef.current = true
    /* A stored 'running' checkpoint means a previous session died mid-run. */
    const current = checkpointRef.current
    if (current?.status === 'running') {
      const paused: AppViewTransferCheckpoint = {
        ...current,
        status: 'paused',
        updatedAt: new Date().toISOString(),
      }
      checkpointRef.current = paused
      account.set([accountDid, 'appViewTransfer'], paused)
      setCheckpoint(paused)
    }
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      const latest = checkpointRef.current
      if (latest?.status === 'running') {
        account.set([accountDid, 'appViewTransfer'], {
          ...latest,
          status: 'paused',
          updatedAt: new Date().toISOString(),
        })
      }
    }
  }, [accountDid])

  const prepareTransfer = () => {
    if (isRunning) return
    if (selectedCollections.length === 0) {
      setError(l`Select at least one type of data to transfer.`)
      return
    }
    if (sourceId === destinationId) {
      setError(l`Choose two different appviews.`)
      return
    }
    setError(undefined)
    confirmControl.open()
  }

  const executeTransfer = async (initial: AppViewTransferCheckpoint) => {
    if (runningRef.current) return
    runningRef.current = true
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await runAppViewTransfer({
        agent,
        initialCheckpoint: initial,
        signal: controller.signal,
        onProgress: saveCheckpoint,
        onCollectionError(id, cause) {
          const status = cause instanceof XRPCError ? cause.status : 'unknown'
          const name = cause instanceof XRPCError ? cause.error : 'unknown'
          logger.error('AppView transfer collection failed', {
            collection: id,
            safeMessage: `${status}:${name}`,
          })
        },
      })
    } catch (e) {
      /* Pausing rejects the run, so only an unexpected fault is worth a log. */
      if (!controller.signal.aborted) {
        logger.error('AppView transfer stopped unexpectedly', {safeMessage: e})
      }
      const latest = checkpointRef.current
      if (latest?.status === 'running') {
        saveCheckpoint({
          ...latest,
          status: 'paused',
          updatedAt: new Date().toISOString(),
        })
      }
    } finally {
      /* A pause still leaves written items behind, so always refresh. */
      invalidateAppViewQueries()
      if (abortRef.current === controller) {
        abortRef.current = undefined
        runningRef.current = false
      }
    }
  }

  /*
   * The active session may read from either appview, so refresh every
   * collection the transfer can touch.
   */
  const invalidateAppViewQueries = () => {
    for (const root of [
      'my-muted-accounts',
      'my-lists',
      'bookmarks',
      'activity-subscriptions',
      'notification-settings',
    ]) {
      void queryClient.invalidateQueries({queryKey: [root]})
    }
  }

  const confirmTransfer = () => {
    const next = createTransferCheckpoint({
      accountDid,
      source: getTransferEndpoint(sourceId),
      destination: getTransferEndpoint(destinationId),
      selectedCollections,
    })
    void executeTransfer(next)
  }

  const pauseTransfer = () => {
    abortRef.current?.abort()
  }

  const resumeTransfer = () => {
    if (!checkpoint || isRunning) return
    void executeTransfer(checkpoint)
  }

  const startOver = () => {
    abortRef.current?.abort()
    checkpointRef.current = undefined
    account.remove([accountDid, 'appViewTransfer'])
    setCheckpoint(undefined)
    setError(undefined)
  }

  const sourceName = endpointNames[sourceId]
  const destinationName = endpointNames[destinationId]
  const confirmationDescription = selectedCollections.includes(
    'notificationPreferences',
  )
    ? l`Copy the selected data from ${sourceName} to ${destinationName}? Nothing at the destination will be deleted. Notification preferences at the destination will be replaced.`
    : l`Copy the selected data from ${sourceName} to ${destinationName}? Nothing at the destination will be deleted.`

  return (
    <Layout.Screen testID="appViewTransferSettingsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Transfer app data</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          {!checkpoint && (
            <>
              <SettingsList.Group contentContainerStyle={[a.gap_lg]}>
                <SettingsList.ItemIcon icon={TransferIcon} />
                <SettingsList.ItemText>
                  <Trans>Transfer app data</Trans>
                </SettingsList.ItemText>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Copy private app data between appviews without changing
                    which one is active. You can run the transfer again later.
                  </Trans>
                </Text>
                <Admonition type="info">
                  <Trans>
                    This is an import, not a sync. Existing destination data is
                    kept, and later removals do not carry between appviews.
                  </Trans>
                </Admonition>
              </SettingsList.Group>

              <SettingsList.Group contentContainerStyle={[a.gap_lg]}>
                <SettingsList.ItemIcon icon={TransferIcon} />
                <SettingsList.ItemText>
                  <Trans>Appviews</Trans>
                </SettingsList.ItemText>
                <EndpointSelector
                  titleText={<Trans>From</Trans>}
                  label={l`Source appview`}
                  value={sourceId}
                  onChange={value => {
                    setSourceId(value)
                    setError(undefined)
                  }}
                />
                <EndpointSelector
                  titleText={<Trans>To</Trans>}
                  label={l`Destination appview`}
                  value={destinationId}
                  onChange={value => {
                    setDestinationId(value)
                    setError(undefined)
                  }}
                />
              </SettingsList.Group>

              <SettingsList.Group contentContainerStyle={[a.gap_md]}>
                <SettingsList.ItemIcon icon={ListIcon} />
                <SettingsList.ItemText>
                  <Trans>Data to transfer</Trans>
                </SettingsList.ItemText>
                <Toggle.Group
                  type="checkbox"
                  label={l`Data to transfer`}
                  values={selectedCollections}
                  onChange={values => {
                    setSelectedCollections(values.filter(isCollectionId))
                    setError(undefined)
                  }}>
                  <View style={[a.gap_md, a.w_full]}>
                    {APP_VIEW_TRANSFER_COLLECTIONS.map(id => (
                      <Toggle.Item
                        key={id}
                        name={id}
                        label={collectionNames[id]}>
                        <Toggle.Checkbox />
                        <Toggle.LabelText
                          style={[a.flex_1, a.font_normal, a.text_md]}>
                          {collectionNames[id]}
                        </Toggle.LabelText>
                      </Toggle.Item>
                    ))}
                  </View>
                </Toggle.Group>
                <Text
                  style={[
                    a.text_xs,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Notification preferences from the source replace
                    notification preferences at the destination. Other selected
                    data is added without removing destination-only items. An
                    activity subscription that exists on both sides keeps the
                    notifications of both. Mutes that cover only reposts or only
                    quote posts are left where they are.
                  </Trans>
                </Text>
              </SettingsList.Group>
            </>
          )}

          {checkpoint && (
            <>
              {checkpoint.status === 'complete' ? (
                <>
                  <TransferResultNotice
                    hasIncompleteCollections={!!hasIncompleteCollections}
                  />
                  <TransferStatus
                    checkpoint={checkpoint}
                    sourceName={endpointNames[checkpoint.source.id]}
                    destinationName={endpointNames[checkpoint.destination.id]}
                    collectionNames={collectionNames}
                  />
                </>
              ) : (
                <TransferProgress
                  checkpoint={checkpoint}
                  collectionNames={collectionNames}
                />
              )}
            </>
          )}

          <View style={[a.gap_md, a.px_xl, a.py_lg]}>
            {error && <Admonition type="error">{error}</Admonition>}
            {!checkpoint && (
              <Button
                label={l`Start transfer`}
                size="large"
                color="primary"
                disabled={selectedCollections.length === 0}
                onPress={prepareTransfer}
                testID="startAppViewTransferButton">
                <ButtonText>
                  <Trans>Continue</Trans>
                </ButtonText>
              </Button>
            )}
            {isRunning && (
              <Button
                label={l`Pause transfer`}
                size="large"
                color="secondary"
                onPress={pauseTransfer}
                testID="pauseAppViewTransferButton">
                <ButtonText>
                  <Trans>Pause transfer</Trans>
                </ButtonText>
              </Button>
            )}
            {checkpoint?.status === 'paused' && (
              <>
                <Button
                  label={l`Resume transfer`}
                  size="large"
                  color="primary"
                  onPress={resumeTransfer}
                  testID="resumeAppViewTransferButton">
                  <ButtonText>
                    <Trans>Resume transfer</Trans>
                  </ButtonText>
                </Button>
                <Button
                  label={l`Start over`}
                  size="large"
                  color="secondary"
                  onPress={startOver}
                  testID="startOverAppViewTransferButton">
                  <ButtonText>
                    <Trans>Start over</Trans>
                  </ButtonText>
                </Button>
              </>
            )}
            {checkpoint?.status === 'complete' && hasFailedCollections && (
              <Button
                label={l`Retry incomplete items`}
                size="large"
                color="primary"
                onPress={resumeTransfer}
                testID="retryAppViewTransferButton">
                <ButtonText>
                  <Trans>Retry incomplete items</Trans>
                </ButtonText>
              </Button>
            )}
            {checkpoint?.status === 'complete' && (
              <Button
                label={l`Start a new transfer`}
                size="large"
                color={hasFailedCollections ? 'secondary' : 'primary'}
                onPress={startOver}
                testID="newAppViewTransferButton">
                <ButtonText>
                  <Trans>Start a new transfer</Trans>
                </ButtonText>
              </Button>
            )}
          </View>
        </SettingsList.Container>
      </Layout.Content>

      <Prompt.Basic
        control={confirmControl}
        title={l`Start data transfer?`}
        description={confirmationDescription}
        cancelButtonCta={l`Cancel`}
        confirmButtonCta={l`Start transfer`}
        onConfirm={confirmTransfer}
      />
    </Layout.Screen>
  )
}

function TransferResultNotice({
  hasIncompleteCollections,
}: {
  hasIncompleteCollections: boolean
}) {
  return (
    <View style={[a.px_xl, a.py_sm]}>
      <Admonition type={hasIncompleteCollections ? 'warning' : 'tip'}>
        {hasIncompleteCollections ? (
          <Trans>
            Some data couldn't be transferred. See the results below.
          </Trans>
        ) : (
          <Trans>The transfer has finished.</Trans>
        )}
      </Admonition>
    </View>
  )
}

function TransferProgress({
  checkpoint,
  collectionNames,
}: {
  checkpoint: AppViewTransferCheckpoint
  collectionNames: Record<AppViewTransferCollectionId, string>
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  /* A checkpoint from an older build holds the order the user toggled in. */
  const ordered = orderedCollections(checkpoint)
  const activeId =
    ordered.find(id => {
      const status = checkpoint.collections[id]?.status ?? 'pending'
      return !['complete', 'failed', 'unsupported'].includes(status)
    }) ?? ordered.at(-1)
  const totalProgress = checkpoint.selectedCollections.reduce((total, id) => {
    const progress = checkpoint.collections[id] ?? emptyProgress()
    return total + collectionProgress(progress)
  }, 0)
  const percent = checkpoint.selectedCollections.length
    ? (totalProgress / checkpoint.selectedCollections.length) * 100
    : 0
  const activeName = activeId ? collectionNames[activeId] : l`app data`
  const statusText =
    checkpoint.status === 'paused'
      ? l`Paused while transferring ${activeName}`
      : l`Transferring ${activeName}...`

  return (
    <SettingsList.Group contentContainerStyle={[a.gap_md]}>
      <SettingsList.ItemIcon icon={ProgressIcon} />
      <SettingsList.ItemText>
        <Trans>Transfer progress</Trans>
      </SettingsList.ItemText>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max: 100, now: Math.round(percent)}}
        style={[
          a.w_full,
          a.rounded_full,
          {height: 8, backgroundColor: t.palette.contrast_100},
        ]}>
        <View
          style={[
            a.rounded_full,
            {
              height: 8,
              width: `${percent}%`,
              backgroundColor: t.palette.primary_500,
            },
          ]}
        />
      </View>
      <Text
        style={[a.w_full, a.text_sm, t.atoms.text_contrast_medium]}
        numberOfLines={1}>
        {statusText}
      </Text>
      <Text
        style={[a.w_full, a.text_xs, t.atoms.text_contrast_low]}
        numberOfLines={1}>
        {checkpoint.status === 'paused' ? (
          <Trans>Resume the transfer to continue.</Trans>
        ) : (
          <Trans>Keep this page open while the transfer is running.</Trans>
        )}
      </Text>
    </SettingsList.Group>
  )
}

function orderedCollections(checkpoint: AppViewTransferCheckpoint) {
  return APP_VIEW_TRANSFER_COLLECTIONS.filter(id =>
    checkpoint.selectedCollections.includes(id),
  )
}

function collectionProgress(
  progress: AppViewTransferCollectionProgress,
): number {
  switch (progress.status) {
    case 'complete':
    case 'failed':
    case 'unsupported':
      return 1
    case 'pending':
      return 0
    case 'countingSource':
      return 0.05
    case 'countingDestination':
      return 0.15
    case 'transferring':
      return progress.sourceCount > 0
        ? 0.2 +
            0.75 *
              Math.min(1, (progress.processedCount ?? 0) / progress.sourceCount)
        : 0.95
  }
}

function TransferStatus({
  checkpoint,
  sourceName,
  destinationName,
  collectionNames,
}: {
  checkpoint: AppViewTransferCheckpoint
  sourceName: string
  destinationName: string
  collectionNames: Record<AppViewTransferCollectionId, string>
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  const finished = checkpoint.status === 'complete'

  const statusText = (progress: AppViewTransferCollectionProgress) => {
    switch (progress.status) {
      case 'pending':
        return l`Waiting`
      case 'countingSource':
      case 'countingDestination':
        return l`Checking...`
      case 'transferring':
        return l`Copying...`
      case 'complete':
        return l`Complete`
      case 'failed':
        if (progress.failedCount) {
          return plural(progress.failedCount, {
            one: "Couldn't copy # item",
            other: "Couldn't copy # items",
          })
        }
        if (progress.failureName === 'UnexpectedError') {
          return progress.failureAt === 'source'
            ? l`Couldn't read the data from ${sourceName}`
            : l`Couldn't write the data to ${destinationName}`
        }
        return progress.failureAt === 'source'
          ? l`${sourceName} unavailable`
          : l`${destinationName} unavailable`
      case 'unsupported':
        return progress.unsupportedAt === 'source'
          ? l`Unavailable on ${sourceName}`
          : l`Unavailable on ${destinationName}`
    }
  }

  return (
    <SettingsList.Group contentContainerStyle={[a.gap_md]}>
      <SettingsList.ItemIcon icon={finished ? CheckIcon : ProgressIcon} />
      <SettingsList.ItemText>
        {finished ? (
          <Trans>Transfer summary</Trans>
        ) : (
          <Trans>Transfer progress</Trans>
        )}
      </SettingsList.ItemText>
      <View style={[a.w_full]}>
        {orderedCollections(checkpoint).map((id, index) => {
          const progress = checkpoint.collections[id] ?? emptyProgress()
          const before = progress.destinationBefore
          const current = progress.destinationAfter ?? before
          const destinationValue = progress.destinationScanned
            ? `${before ?? 0} -> ${current ?? 0} (+${progress.transferredCount})`
            : `... -> ... (+${progress.transferredCount})`
          return (
            <View
              key={id}
              style={[
                a.gap_2xs,
                a.py_sm,
                index > 0 && [a.border_t, t.atoms.border_contrast_low],
              ]}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_between,
                  a.gap_sm,
                ]}>
                <Text style={[a.flex_1, a.font_semi_bold]} numberOfLines={1}>
                  {collectionNames[id]}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    a.text_xs,
                    progress.status === 'failed'
                      ? {color: t.palette.negative_500}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {statusText(progress)}
                </Text>
              </View>
              <SummaryLine
                label={sourceName}
                value={
                  progress.sourceScanned ? `${progress.sourceCount}` : '...'
                }
              />
              <SummaryLine label={destinationName} value={destinationValue} />
            </View>
          )
        })}
      </View>
    </SettingsList.Group>
  )
}

function SummaryLine({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.justify_between, a.gap_md]}>
      <Text
        style={[a.flex_1, a.text_sm, t.atoms.text_contrast_medium]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text style={[a.text_sm, a.font_semi_bold]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function useCollectionNames(): Record<AppViewTransferCollectionId, string> {
  const {t: l} = useLingui()
  return {
    mutedAccounts: l`Muted accounts`,
    mutedLists: l`Muted lists`,
    bookmarks: l`Bookmarks`,
    activitySubscriptions: l`Activity notifications`,
    notificationPreferences: l`Notification preferences`,
  }
}

function emptyProgress(): AppViewTransferCollectionProgress {
  return {status: 'pending', sourceCount: 0, transferredCount: 0}
}

function isCollectionId(value: string): value is AppViewTransferCollectionId {
  return APP_VIEW_TRANSFER_COLLECTIONS.includes(
    value as AppViewTransferCollectionId,
  )
}
