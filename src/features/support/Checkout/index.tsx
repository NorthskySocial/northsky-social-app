import {DonationOptions} from '../DonationOptions'
import {type DonationsConfig} from '../links'

/**
 * Native pays through Stripe payment links. Embedded checkout is web only, and
 * paying outside the app also keeps clear of the store rules on donations.
 */
export function Checkout({config}: {config: DonationsConfig}) {
  return <DonationOptions config={config} />
}
