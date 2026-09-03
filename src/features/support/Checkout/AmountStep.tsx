import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'
import {
  DEFAULT_MAX_CENTS,
  DEFAULT_MIN_CENTS,
  defaultPresetCents,
  isAmountInRange,
  parseAmountInput,
} from '../amount'
import {
  DEFAULT_INTERVAL,
  type DonationCurrency,
  type DonationInterval,
  type DonationsConfig,
  SUPPORTED_DONATION_CURRENCIES,
} from '../links'

const FALLBACK_PRESETS = [500, 1000, 2500, 5000]

export function AmountStep({
  config,
  error,
  onSubmit,
}: {
  config: DonationsConfig
  error?: string
  onSubmit: (
    amountCents: number,
    currency: DonationCurrency,
    interval: DonationInterval,
  ) => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const presets = config.presetsCents?.length
    ? config.presetsCents
    : FALLBACK_PRESETS
  const minCents = config.minCents ?? DEFAULT_MIN_CENTS
  const maxCents = config.maxCents ?? DEFAULT_MAX_CENTS

  const [interval, setInterval] = useState<DonationInterval>(DEFAULT_INTERVAL)
  const [currency, setCurrency] = useState<DonationCurrency>(config.currency)
  const [amountCents, setAmountCents] = useState(defaultPresetCents(presets))
  const [customInput, setCustomInput] = useState('')

  const customCents = customInput ? parseAmountInput(customInput) : null
  const selectedCents = customInput ? customCents : amountCents
  const isValid =
    selectedCents !== null && isAmountInRange(selectedCents, minCents, maxCents)

  const formatAmount = (cents: number) =>
    i18n.number(cents / 100, {
      style: 'currency',
      currency: currency.toUpperCase(),
    })

  return (
    <View style={[a.gap_md]}>
      <SegmentedControl.Root
        type="radio"
        label={l`Donation frequency`}
        value={interval}
        onChange={setInterval}>
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

      <SegmentedControl.Root
        type="radio"
        label={l`Donation currency`}
        value={currency}
        onChange={setCurrency}>
        {SUPPORTED_DONATION_CURRENCIES.map(value => {
          const label = value.toUpperCase()
          return (
            <SegmentedControl.Item key={value} label={label} value={value}>
              <SegmentedControl.ItemText>{label}</SegmentedControl.ItemText>
            </SegmentedControl.Item>
          )
        })}
      </SegmentedControl.Root>

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {presets.map(cents => (
          <Button
            key={cents}
            label={l`Donate ${formatAmount(cents)}`}
            size="small"
            variant="solid"
            color={
              !customInput && cents === amountCents ? 'primary' : 'secondary'
            }
            style={[a.rounded_full]}
            onPress={() => {
              setAmountCents(cents)
              setCustomInput('')
            }}>
            <ButtonText>{formatAmount(cents)}</ButtonText>
          </Button>
        ))}
      </View>

      <View>
        <TextField.LabelText>
          <Trans>Other amount</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={customInput !== '' && !isValid}>
          <TextField.Input
            label={l`Other amount`}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder={l`0.00`}
            inputMode="decimal"
          />
        </TextField.Root>
        <Text style={[a.pt_xs, a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Between {formatAmount(minCents)} and {formatAmount(maxCents)}.
          </Trans>
        </Text>
      </View>

      {error && (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      )}

      <Button
        label={
          isValid
            ? l`Support with ${formatAmount(selectedCents)}`
            : l`Choose an amount`
        }
        size="large"
        variant="solid"
        color="primary"
        disabled={!isValid}
        style={[a.rounded_full]}
        onPress={() => {
          if (isValid) onSubmit(selectedCents, currency, interval)
        }}>
        <ButtonText>
          {isValid ? (
            <Trans>Support with {formatAmount(selectedCents)}</Trans>
          ) : (
            <Trans>Choose an amount</Trans>
          )}
        </ButtonText>
      </Button>
    </View>
  )
}
