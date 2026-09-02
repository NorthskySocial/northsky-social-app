import {useCallback, useEffect, useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import {loadStripe, type Stripe} from '@stripe/stripe-js'

import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {
  createDonationSession,
  type DonationSessionInput,
  getDonationStatus,
} from '../api'
import {DonationOptions} from '../DonationOptions'
import {
  type DonationCurrency,
  type DonationInterval,
  type DonationsConfig,
} from '../links'
import {AmountStep} from './AmountStep'

type Step =
  | {name: 'amount'; error?: string}
  | {name: 'pay'; input: DonationSessionInput}
  | {name: 'thanks'}

/**
 * Stripe caches the Stripe object, but `loadStripe` must not run on every
 * render, and the key is only known at run time.
 */
let stripePromise: Promise<Stripe | null> | undefined
function getStripe(publishableKey: string) {
  stripePromise ??= loadStripe(publishableKey)
  return stripePromise
}

/** Reads the session Stripe returned the donor with, if any. */
function getReturnedSessionId(): string | undefined {
  const id = new URLSearchParams(window.location.search).get('session_id')
  return id ?? undefined
}

/**
 * Clears the returned session so a reload does not show the thank-you panel,
 * or retry the same confirmation, again.
 */
function clearReturnedSessionId() {
  const url = new URL(window.location.href)
  url.searchParams.delete('session_id')
  window.history.replaceState({}, '', url.toString())
}

export function Checkout({config}: {config: DonationsConfig}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const [step, setStep] = useState<Step>({name: 'amount'})

  const canCheckout = Boolean(config.checkout && config.publishableKey)

  useEffect(() => {
    if (!canCheckout) return
    const sessionId = getReturnedSessionId()
    if (!sessionId) return

    getDonationStatus(sessionId)
      .then(status => {
        clearReturnedSessionId()
        setStep(
          status === 'complete'
            ? {name: 'thanks'}
            : {
                name: 'amount',
                error: l`That payment did not complete. You can try again.`,
              },
        )
      })
      .catch(err => {
        logger.warn('donations: could not read the session status', {
          message: err,
        })
        // Leave session_id in the URL: a reload retries confirmation instead
        // of losing track of a payment that may have completed.
        setStep({
          name: 'amount',
          error: l`We could not confirm the payment. Please refresh and try again.`,
        })
      })
  }, [canCheckout, l])

  const onSubmit = (
    amountCents: number,
    currency: DonationCurrency,
    interval: DonationInterval,
  ) => {
    setStep({
      name: 'pay',
      input: {amountCents, currency, interval, did: currentAccount?.did},
    })
  }

  const fetchClientSecret = useCallback(async () => {
    if (step.name !== 'pay') throw new Error('no donation in progress')
    try {
      return await createDonationSession(step.input)
    } catch (err) {
      logger.error('donations: could not create the session', {message: err})
      setStep({
        name: 'amount',
        error: l`We could not start the payment. Please try again.`,
      })
      throw err
    }
  }, [step, l])

  if (!canCheckout) {
    return <DonationOptions config={config} />
  }

  if (step.name === 'thanks') {
    return (
      <View style={[a.gap_md]}>
        <Text style={[a.text_md, a.leading_snug]}>
          <Trans>
            Thank you. Your support keeps this place running. Stripe has emailed
            your receipt.
          </Trans>
        </Text>
        <Button
          label={l`Donate again`}
          size="small"
          variant="solid"
          color="secondary"
          style={[a.rounded_full]}
          onPress={() => setStep({name: 'amount'})}>
          <ButtonText>
            <Trans>Donate again</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  if (step.name === 'pay') {
    return (
      <View style={[a.gap_md]}>
        {/* Stripe renders an iframe here, so it needs a plain container. */}
        <View style={[a.w_full]}>
          <EmbeddedCheckoutProvider
            stripe={getStripe(config.publishableKey!)}
            options={{
              fetchClientSecret,
              onComplete: () => setStep({name: 'thanks'}),
            }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </View>
        <Button
          label={l`Change the amount`}
          size="small"
          variant="ghost"
          color="secondary"
          onPress={() => setStep({name: 'amount'})}>
          <ButtonText style={[t.atoms.text_contrast_medium]}>
            <Trans>Change the amount</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  return <AmountStep config={config} error={step.error} onSubmit={onSubmit} />
}
