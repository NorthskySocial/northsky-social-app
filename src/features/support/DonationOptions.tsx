import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {ButtonText} from '#/components/Button'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {
  type DonationInterval,
  type DonationsConfig,
  getDonationUrl,
  getPresetAmounts,
} from './links'

export function DonationOptions({config}: {config: DonationsConfig}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const {currentAccount} = useSession()
  const monthlyAvailable = getPresetAmounts(config, 'monthly').length > 0
  const [frequency, setFrequency] = useState<DonationInterval>(
    monthlyAvailable ? 'monthly' : 'oneTime',
  )

  const amounts = getPresetAmounts(config, frequency)
  const customUrl =
    frequency === 'oneTime'
      ? getDonationUrl(config, 'oneTime', 'custom', currentAccount?.did)
      : undefined

  const formatAmount = (cents: number) =>
    i18n.number(cents / 100, {
      style: 'currency',
      currency: config.currency.toUpperCase(),
    })

  return (
    <View style={[a.gap_md]}>
      {monthlyAvailable && (
        <SegmentedControl.Root
          type="radio"
          label={l`Donation frequency`}
          value={frequency}
          onChange={setFrequency}>
          <SegmentedControl.Item label={l`One-time`} value="oneTime">
            <SegmentedControl.ItemText>
              <Trans>One-time</Trans>
            </SegmentedControl.ItemText>
          </SegmentedControl.Item>
          <SegmentedControl.Item label={l`Monthly`} value="monthly">
            <SegmentedControl.ItemText>
              <Trans>Monthly</Trans>
            </SegmentedControl.ItemText>
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      )}

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {amounts.map(cents => {
          const url = getDonationUrl(
            config,
            frequency,
            cents,
            currentAccount?.did,
          )
          if (!url) return null
          return (
            <Link
              key={cents}
              to={url}
              label={l`Donate ${formatAmount(cents)}`}
              size="small"
              variant="solid"
              color="secondary"
              style={[a.rounded_full, a.justify_center]}>
              <ButtonText>{formatAmount(cents)}</ButtonText>
            </Link>
          )
        })}
        {customUrl && (
          <Link
            to={customUrl}
            label={l`Donate another amount`}
            size="small"
            variant="solid"
            color="secondary"
            style={[a.rounded_full, a.justify_center]}>
            <ButtonText>
              <Trans>Other amount</Trans>
            </ButtonText>
          </Link>
        )}
      </View>

      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        <Trans>
          You pay on Stripe's secure page. Stripe emails your receipt.
        </Trans>
      </Text>
    </View>
  )
}
