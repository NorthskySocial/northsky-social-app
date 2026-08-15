# Support (donations)

The Support screen takes donations two ways:

- **Web**: Stripe Embedded Checkout, on our own page. bskyweb creates the
  Checkout Session, because Stripe removed the client-only flow and the browser
  cannot hold a secret key.
- **Native**: Stripe payment links, opened in the in-app browser. There is no
  embedded checkout for React Native, and paying outside the app also keeps
  clear of the store rules on donations.

Stripe emails the receipt, and nothing in our system changes state on payment,
so there are no webhooks and no stored records.

Monthly donors manage or cancel through the Stripe customer portal. The app
links to the portal **login page**, where a donor enters their email and Stripe
sends a one-time link. That keeps the no-state design: an API-created portal
session needs a customer id, which we would have to store.

## Server

The routes live in `bskyweb/cmd/bskyweb/donations.go` and are registered only
when `STRIPE_SECRET_KEY` is set.

```http
POST /api/donations/session
body: {amountCents, interval: "one_time" | "month", did?}
200:  {clientSecret}

GET /api/donations/status?session_id=cs_...
200: {status: "complete" | "open" | "expired"}
```

The server validates the amount, because the browser cannot be trusted with a
price. One-time donations use `mode=payment`; monthly donations use
`mode=subscription` with a recurring `price_data`, so any amount can recur.

Which payment methods appear is dashboard state, not code. Set
`DONATION_PAYMENT_METHOD_CONFIGURATION` to pick a configuration, then turn
methods on and off in the Stripe dashboard without a deploy. Apple Pay and
Google Pay are wallets on the card method: Stripe places them above the form,
and they need HTTPS and a registered domain, so they never appear on
`http://localhost`.

| Env | Purpose | Default |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Enables checkout. **A real secret: k8s Secret only.** | empty |
| `STRIPE_PUBLISHABLE_KEY` | Sent to the app | empty |
| `STRIPE_PORTAL_URL` | Customer portal login page. Must be an https URL. Empty, or not https, hides the Manage Subscription button. | empty |
| `DONATION_CURRENCY` | Three letter code | `usd` |
| `DONATION_PRESETS_CENTS` | Comma separated amounts | `500,1000,2500,5000` |
| `DONATION_MIN_CENTS` | Smallest accepted donation | `100` |
| `DONATION_MAX_CENTS` | Largest accepted donation | `100000` |
| `DONATION_PAYMENT_METHOD_CONFIGURATION` | Stripe payment method configuration id, e.g. `pmc_...`. Empty uses the default configuration. | empty |
| `DONATION_RETURN_BASE_URL` | Origin Stripe returns the donor to | the brand base URL |
| `DONATION_LINKS` | Payment links for native, as JSON | empty |

## Deployment

**The web app needs nothing at image build time.** bskyweb always injects the
config into the page, and the app prefers that over anything in the bundle. So
every web setting is pod environment, held in the deployment repository. Changing
an amount, a preset or the payment method set is a pod restart, not a release.

Three values differ between environments: the payment method configuration id
and the portal URL (both are separate in test mode and live mode), and the
return base URL.

```yaml
# Secret: the only sensitive value in this feature
stringData:
  STRIPE_SECRET_KEY: sk_live_...

# Deployment env: none of these are secret
- STRIPE_PUBLISHABLE_KEY: pk_live_...
- STRIPE_PORTAL_URL: https://billing.stripe.com/p/login/...
- DONATION_PAYMENT_METHOD_CONFIGURATION: pmc_...
- DONATION_RETURN_BASE_URL: https://northsky.app
- DONATION_CURRENCY: usd
- DONATION_PRESETS_CENTS: "500,1000,2500,5000"
- DONATION_MIN_CENTS: "100"
- DONATION_MAX_CENTS: "100000"
```

Leaving `STRIPE_SECRET_KEY` out is a safe state, not a broken one: the routes do
not register and the screen falls back to payment links, then to the website
link. An environment can run without a key until it is ready.

Before wallets can appear, register the domain in Stripe:

```bash
stripe payment_method_domains create --domain-name northsky.app
```

After a deploy, one command shows whether the config reached the pod:

```bash
curl -s https://northsky.app/support | grep -o '__NORTHSKY_DONATIONS__ = .*'
```

Expect `"checkout":true` and the publishable key. A `false` means the secret key
did not arrive.

Native builds have no server to ask, so they read `EXPO_PUBLIC_DONATIONS_CONFIG`
from the `.env` file that the EAS build workflows write.

## Client config

The app reads one JSON object. bskyweb merges the payment links with the values
only it knows, then writes the result into the page as
`window.__NORTHSKY_DONATIONS__`:

```json
{
  "currency": "usd",
  "checkout": true,
  "publishableKey": "pk_live_...",
  "portalUrl": "https://billing.stripe.com/p/login/...",
  "presetsCents": [500, 1000, 2500, 5000],
  "minCents": 100,
  "maxCents": 100000,
  "oneTime": {
    "custom": "https://donate.stripe.com/PAY_WHAT_YOU_WANT",
    "500": "https://donate.stripe.com/..."
  },
  "monthly": {"500": "https://donate.stripe.com/..."}
}
```

The same shape can be built into the bundle through
`EXPO_PUBLIC_DONATIONS_CONFIG`. Native builds have no server, so they need it
there. The injected value wins when both are present.

**The build-time value is read at build time, not run time.** Metro replaces
`process.env.EXPO_PUBLIC_*` with literal strings, so a variable set on a running
container never reaches native builds. Pass it as a Docker build argument for
the web image and in the `.env` file for native builds.

Nothing in this config is secret. Payment links and the publishable key are
public by design. The secret key never leaves bskyweb.

## Screen behaviour

1. `checkout` true and a publishable key present: the amount form, then the
   embedded Stripe form, then a thank-you panel.
2. Otherwise: payment link buttons, one per configured tier, plus "Other amount"
   for the pay-what-you-want link.
3. No config at all: a link to the website.

A **Manage Subscription** button appears below whenever `portalUrl` is set. It
does not depend on checkout, so an environment can offer the portal on its own.

A wrong portal URL only removes that button. The server drops a value that is
not https, and the app drops one that survives anyway, so the donation form
still works.

**Native builds need the portal URL in `DONATIONS_CONFIG`.** `STRIPE_PORTAL_URL`
reaches the web app only. Native reads the build-time config, so add `portalUrl`
to that secret before the next EAS build. Without it, native donors default to a
monthly donation with no way to cancel inside the app.

Stripe returns the donor to `/support?session_id=...`. The screen reads the
status once, then removes the parameter so a reload does not repeat the
thank-you panel.

## Payment links

Payment link tiers are keyed by amount in the smallest currency unit. `custom`
is a "customers choose what to pay" link, which Stripe supports for one-time
payments only, so it has no monthly equivalent. Adding a tier means creating the
link in the dashboard and adding one entry to `DONATION_LINKS`. Never put a
test-mode link into a production deployment.

## Attribution

When somebody is signed in, the app sends the DID: as
`?client_reference_id=<base64url did>` on a payment link, or as `metadata.did`
on a Checkout Session. To read a payment link value back:

```js
const did = atob(clientReferenceId.replace(/-/g, '+').replace(/_/g, '/'))
```

Either value is a hint, not proof of identity. Anybody can send any DID. Do not
grant account benefits from it without stronger verification.

## Testing

```bash
npm i -g @stripe/cli
stripe sandbox create
```

Run bskyweb with the sandbox secret key and pay with `4242 4242 4242 4242`.
Apple Pay needs Safari, HTTPS and a registered domain, so it is normally absent
in local development.
