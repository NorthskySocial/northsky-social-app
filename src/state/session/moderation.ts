import {type Client} from '@atproto/lex'
import {type DidString} from '@atproto/syntax'

import {IS_TEST_USER} from '#/lib/constants'
// northsky: Northsky moderation ships as an app labeler beside Bluesky;
// regional authorities stay off, so configureAdditionalModerationAuthorities
// is not imported.
import {APP_LABELER_DIDS} from '#/brand/moderation'
import {com} from '#/lexicons'
import {account as accountStorage} from '#/storage'
import {configureGlobalAppLabelers} from './additional-moderation-authorities'
import {type SessionAccount} from './types'

/** The moderation surface of a session bundle. */
type ModerationSession = {appviewClient: Client}

/**
 * Cache an account's subscribed labeler DIDs. Called on every preferences
 * fetch, so the cache is eventually consistent with the server.
 */
export function saveLabelers(did: string, value: string[]) {
  accountStorage.set([did, 'labelers'], value)
}

/**
 * Read the cached labeler DIDs for an account, or `undefined` if none have
 * been cached yet (first session on this device) or the entry is unreadable.
 */
export function readLabelers(did: string): string[] | undefined {
  try {
    return accountStorage.get([did, 'labelers'])
  } catch {
    /* a corrupt entry fails JSON.parse inside Storage.get; treat as no cache */
    return undefined
  }
}

/**
 * Apply an account's labeler subscriptions to the appview client, without
 * duplicating the globally redacted Bluesky moderation authority.
 *
 * The Bluesky DID is filtered out because it already flows through the global
 * `Client.appLabelers`, which lex emits with a `;redact` suffix. Listing it
 * per-instance would add a second, non-redacting entry for the same authority:
 * lex collects the two lists into a `Set` keyed on the suffixed string, so
 * neither dedupes against the other.
 *
 * Only the appview client takes subscriptions - the PDS and chat clients suppress
 * labelers entirely (see clients.ts).
 */
export function applyLabelersToClient(
  client: Client,
  subscribedDids: string[],
) {
  client.setLabelers(
    // northsky: every APP_LABELER_DID is global and redacting, not just Bluesky's
    subscribedDids.filter(
      did => !APP_LABELER_DIDS.includes(did as DidString),
    ) as DidString[],
  )
}

export function configureModerationForGuest() {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToAppLabelers()
}

/**
 * Configure global app labelers and the account's cached labeler
 * subscriptions. Fully synchronous so session setup can apply labeler headers
 * in the same tick, before any request goes out.
 */
export function configureModerationForAccount(
  bundle: ModerationSession,
  account: SessionAccount,
) {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToAppLabelers()
  if (IS_TEST_USER(account.handle)) {
    // Test accounts may briefly use the production authority while this resolves.
    void trySwitchToTestAppLabeler(bundle.appviewClient)
  }

  // The code below is actually relevant to production (and isn't global).
  const labelerDids = readLabelers(account.did)
  if (labelerDids) {
    applyLabelersToClient(bundle.appviewClient, labelerDids)
  } else {
    // If there are no headers in the storage, we'll not send them on the initial requests.
    // If we wanted to fix this, we could block on the preferences query here.
  }
}

// northsky: Northsky moderation ships as an app labeler beside Bluesky.
function switchToAppLabelers() {
  configureGlobalAppLabelers([...APP_LABELER_DIDS])
}

/** Resolve and install the test environment's moderation authority. */
async function trySwitchToTestAppLabeler(client: Client) {
  const did = (
    await client
      .call(com.atproto.identity.resolveHandle, {
        handle: 'mod-authority.test',
      })
      .catch(_ => undefined)
  )?.did
  if (did) {
    console.warn('USING TEST ENV MODERATION')
    configureGlobalAppLabelers([did])
  }
}
