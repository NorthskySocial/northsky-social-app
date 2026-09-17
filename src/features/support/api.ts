import {type DonationCurrency, type DonationInterval} from './links'

/**
 * bskyweb serves the app, so the donation routes are same-origin in production.
 * A local dev server is a different origin, hence the override.
 */
const API_BASE = process.env.EXPO_PUBLIC_DONATIONS_API_URL ?? ''

export type DonationSessionInput = {
  amountCents: number
  currency: DonationCurrency
  interval: DonationInterval
  did?: string
}

export class DonationError extends Error {}

async function readError(response: Response): Promise<never> {
  let message = `donation request failed with status ${response.status}`
  try {
    const body = (await response.json()) as {error?: string}
    if (body.error) message = body.error
  } catch {}
  throw new DonationError(message)
}

/**
 * Creates a Checkout Session and returns its client secret. The server owns the
 * amount validation, because the browser cannot be trusted with a price.
 */
export async function createDonationSession({
  amountCents,
  currency,
  interval,
  did,
}: DonationSessionInput): Promise<string> {
  const response = await fetch(`${API_BASE}/api/donations/session`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      amountCents,
      currency,
      interval: interval === 'monthly' ? 'month' : 'one_time',
      did,
    }),
  })

  if (!response.ok) await readError(response)

  const body = (await response.json()) as {clientSecret?: string}
  if (!body.clientSecret) {
    throw new DonationError('the server did not return a client secret')
  }
  return body.clientSecret
}

export type DonationStatus = 'complete' | 'open' | 'expired'

function parseDonationStatus(status: unknown): DonationStatus {
  if (status === 'complete' || status === 'open' || status === 'expired') {
    return status
  }
  throw new DonationError('the server returned an invalid donation status')
}

export async function getDonationStatus(
  sessionId: string,
): Promise<DonationStatus> {
  const response = await fetch(
    `${API_BASE}/api/donations/status?session_id=${encodeURIComponent(sessionId)}`,
  )

  if (!response.ok) await readError(response)

  const body = (await response.json()) as {status?: string}
  return parseDonationStatus(body.status ?? 'open')
}
