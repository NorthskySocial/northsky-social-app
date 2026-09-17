import {z} from 'zod'

import {logger} from '#/logger'
import {DONATIONS_CONFIG} from '#/env'
import {getRuntimeDonationsConfig} from './runtimeConfig'

export type DonationInterval = 'oneTime' | 'monthly'
export type DonationCurrency = 'cad' | 'usd' | 'eur'

export const SUPPORTED_DONATION_CURRENCIES: DonationCurrency[] = [
  'cad',
  'usd',
  'eur',
]

/**
 * A donation amount in the smallest currency unit, or the pay-what-you-want
 * link, where the amount is collected by Stripe.
 */
export type DonationAmount = number | 'custom'

const donationsConfigSchema = z.object({
  currency: z.enum(['cad', 'usd', 'eur']),
  /**
   * Whether the server can create a Checkout Session. Only bskyweb knows this,
   * so it is absent from a build-time config.
   */
  checkout: z.boolean().optional(),
  publishableKey: z.string().optional(),
  /**
   * Stripe customer portal login page. A donor enters their email and Stripe
   * sends a one-time link, so this app stores no customer id. A bad value falls
   * back to undefined instead of failing the parse, because one wrong URL must
   * not hide the donation form. Native builds read this from the bundle, where
   * the server cannot check it first.
   */
  portalUrl: z
    .string()
    .url()
    .startsWith('https://')
    .optional()
    .catch(undefined),
  presetsCents: z.array(z.number().int().positive()).optional(),
  minCents: z.number().int().positive().optional(),
  maxCents: z.number().int().positive().optional(),
  /** Payment links, used on native and when checkout is unavailable. */
  oneTime: z.record(z.string(), z.string().url()).optional(),
  monthly: z.record(z.string(), z.string().url()).optional(),
})

export type DonationsConfig = z.infer<typeof donationsConfigSchema>

export function parseDonationsConfig(
  raw: string | undefined,
): DonationsConfig | null {
  if (!raw) return null

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    logger.warn('donations: the config is not valid JSON')
    return null
  }

  const result = donationsConfigSchema.safeParse(json)
  if (!result.success) {
    logger.warn('donations: the config does not match the expected shape')
    return null
  }
  return result.data
}

/** The frequency the form offers first. */
export const DEFAULT_INTERVAL: DonationInterval = 'monthly'

/**
 * The frequency to select first from payment links. Monthly needs a link per
 * amount, so without those links the form falls back to one-time. Otherwise the
 * frequency control hides itself and the amount list renders empty.
 */
export function defaultLinkInterval(config: DonationsConfig): DonationInterval {
  return getPresetAmounts(config, 'monthly').length > 0
    ? DEFAULT_INTERVAL
    : 'oneTime'
}

/**
 * Amounts that have a configured link for the interval, in ascending order.
 */
export function getPresetAmounts(
  config: DonationsConfig,
  interval: DonationInterval,
): number[] {
  return Object.keys(config[interval] ?? {})
    .filter(key => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => a - b)
}

/**
 * The URL to open for an amount, or undefined when the deployment did not
 * configure that tier. Stripe supports customer-chosen amounts for one-time
 * payments only, so the pay-what-you-want link has no monthly equivalent.
 */
export function getDonationUrl(
  config: DonationsConfig,
  interval: DonationInterval,
  amount: DonationAmount,
  did?: string,
): string | undefined {
  const url = config[interval]?.[String(amount)]
  if (!url) return undefined
  if (!did) return url
  const donationUrl = new URL(url)
  donationUrl.searchParams.set('client_reference_id', encodeDid(did))
  return donationUrl.toString()
}

/**
 * Stripe's `client_reference_id` accepts alphanumeric characters, dashes and
 * underscores only, so the DID is sent as base64url.
 */
export function encodeDid(did: string): string {
  return btoa(did).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * The config the web server injected wins over the one built into the bundle, so
 * a deployment can change it without a new build.
 */
export const DONATIONS = parseDonationsConfig(
  getRuntimeDonationsConfig() ?? DONATIONS_CONFIG,
)
