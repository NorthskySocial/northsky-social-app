import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

// northsky: the brand feedback form replaces the in-app feedback dialog
import {FEEDBACK_FORM_URL} from '#/lib/constants'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {logger} from '#/logger'
import {
  usePreferencesQuery,
  useSetIsBetaUserMutation,
} from '#/state/queries/preferences'
import {useSession} from '#/state/session'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {ButtonIcon, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import {Beaker_Stroke2_Corner2_Rounded as BeakerIcon} from '#/components/icons/Beaker'
import {BubbleInfo_Stroke2_Corner2_Rounded as BubbleInfoIcon} from '#/components/icons/BubbleInfo'
// northsky: icon for the appview data transfer link
import {Transfer_Stroke2_Corner0_Rounded as TransferIcon} from '#/components/icons/Transfer'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {features, useAnalytics} from '#/analytics'
import {getTargetedFeatures} from '#/analytics/features'
import {IS_WEB} from '#/env'
import {account} from '#/storage'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'BetaFeaturesSettings'
>

export function BetaFeaturesSettingsScreen({}: Props) {
  const t = useTheme()
  const ax = useAnalytics()
  const {t: l, i18n} = useLingui()
  const {data: preferences} = usePreferencesQuery()
  const {currentAccount} = useSession()
  const {mutateAsync: setIsBetaUser} = useSetIsBetaUserMutation()
  const isBetaUser = preferences?.bskyAppState?.isBetaUser ?? false
  const [isPending, setIsPending] = useState(false)

  /*
   * `getTargetedFeatures` reads the GrowthBook singleton synchronously, but
   * gates arrive asynchronously (from `init` on mount, or `refresh` after a
   * toggle). Hold the result in state and re-read whenever fresh gates land so
   * the list reflects the latest evaluation instead of a stale render.
   */
  const [betaFeatures, setBetaFeatures] = useState(() =>
    getTargetedFeatures(i18n),
  )

  useEffect(() => {
    let cancelled = false
    void features.refresh({strategy: 'prefer-fresh-gates'}).then(() => {
      if (!cancelled) setBetaFeatures(getTargetedFeatures(i18n))
    })
    return () => {
      cancelled = true
    }
  }, [i18n])

  const onChange = async (next: boolean) => {
    try {
      setIsPending(true)
      await setIsBetaUser(next)
      /*
       * Cache the new value so analytics can set the `isBetaUser` GrowthBook
       * attribute synchronously on the next boot, before beta-gated features
       * are evaluated. Scoped per account, since `isBetaUser` is
       * account-specific.
       */
      if (currentAccount) {
        account.set([currentAccount.did, 'isBetaUser'], next)
      }
      ax.metric('betaFeatures:toggle', {
        enabled: next,
        betaFeatureKeys: betaFeatures.map(feature => feature.key),
      })
    } catch (e) {
      logger.error('Failed to toggle beta features', {safeMessage: e})
      Toast.show(l`Something went wrong, please try again.`, {type: 'error'})
      return
    } finally {
      setIsPending(false)
    }
    /*
     * The toggle already succeeded; re-evaluate feature gates against the new
     * attribute in-session as a best-effort follow-up. A failure here should
     * not surface as a toggle error.
     */
    try {
      await features.refresh({strategy: 'prefer-fresh-gates'})
      setBetaFeatures(getTargetedFeatures(i18n))
    } catch {}
  }

  const onPressShareFeedback = () => {
    ax.metric('betaFeatures:feedback:open', {
      betaFeatureKeys: betaFeatures.map(feature => feature.key),
    })
  }

  /*
   * northsky: the app data transfer is a local beta feature rather than a
   * remote gate, so a beta user always has one even when `getTargetedFeatures`
   * returns nothing.
   */
  const hasBetaFeatures = isBetaUser || betaFeatures.length > 0

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Beta features</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <Toggle.Item
            name="enable_beta_features"
            label={l`Enable beta features`}
            value={isBetaUser}
            disabled={isPending}
            onChange={value => void onChange(value)}>
            <SettingsList.Item>
              <View style={[a.flex_1, a.gap_2xs]}>
                <SettingsList.ItemText style={[a.font_semi_bold]}>
                  <Trans>Enable beta features</Trans>
                </SettingsList.ItemText>
                <Text
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Get early access to experimental features we’re testing.
                  </Trans>
                </Text>
              </View>
              <Toggle.Platform />
            </SettingsList.Item>
          </Toggle.Item>

          <View style={[a.px_xl, a.gap_md]}>
            <Admonition type="info">
              {IS_WEB
                ? l({
                    message:
                      'Beta features may be unstable. Some changes may require reloading the app.',
                    context: 'web',
                  })
                : l({
                    message:
                      'Beta features may be unstable. Some changes may require restarting the app.',
                    context: 'native',
                  })}
            </Admonition>

            {/* northsky: the brand feedback form, not the in-app report dialog */}
            <Link
              to={FEEDBACK_FORM_URL({})}
              label={l`Share feedback`}
              size="small"
              color="primary_subtle"
              onPress={onPressShareFeedback}
              style={[a.self_start, a.mt_xs, a.mb_xl]}>
              <ButtonIcon icon={BubbleInfoIcon} />
              <ButtonText>
                <Trans>Share feedback</Trans>
              </ButtonText>
            </Link>

            {!hasBetaFeatures ? (
              <View style={[a.align_center, a.gap_xs, a.py_5xl]}>
                <BeakerIcon
                  size="4xl"
                  fill={t.palette.contrast_100}
                  style={[a.mb_md]}
                />
                <Text style={[a.text_md, a.font_semi_bold, a.leading_snug]}>
                  <Trans>No beta features at the moment.</Trans>
                </Text>
                <Text
                  style={[a.text_sm, t.atoms.text_contrast_high]}
                  emoji={false}>
                  <Trans>Check back later!</Trans>
                </Text>
              </View>
            ) : (
              <>
                {/* northsky: the beaker stays as the backdrop of this section */}
                <View style={[a.align_center, a.py_lg]}>
                  <BeakerIcon size="4xl" fill={t.palette.contrast_100} />
                </View>
                <Text style={[a.text_md, a.font_semi_bold]}>
                  <Trans>Current beta features</Trans>
                </Text>
                <View style={[a.gap_sm]}>
                  {betaFeatures.map(feature => (
                    <View
                      key={feature.key}
                      style={[
                        a.p_md,
                        a.rounded_md,
                        a.border,
                        t.atoms.border_contrast_low,
                      ]}>
                      <Text
                        style={[
                          a.text_md,
                          a.font_medium,
                          a.pb_2xs,
                          t.atoms.text_contrast_high,
                        ]}>
                        {feature.name}
                      </Text>
                      <Text
                        style={[
                          a.text_sm,
                          a.leading_snug,
                          t.atoms.text_contrast_high,
                        ]}>
                        {feature.description}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* northsky: appview data transfer, listed for beta users */}
          {isBetaUser && (
            <SettingsList.LinkItem
              to="/settings/transfer-app-data"
              label={l`Transfer app data`}>
              <SettingsList.ItemIcon icon={TransferIcon} />
              <SettingsList.ItemText>
                <Trans>Transfer app data</Trans>
              </SettingsList.ItemText>
            </SettingsList.LinkItem>
          )}
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
