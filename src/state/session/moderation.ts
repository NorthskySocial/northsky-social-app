import {AtpAgent, BSKY_LABELER_DID} from '@atproto/api'

import {IS_TEST_USER} from '#/lib/constants'
import {APP_LABELER_DIDS} from '#/brand/moderation'
import {readLabelers} from './agent-config'
import {type SessionAccount} from './types'

export function configureModerationForGuest() {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToAppLabelers()
}

export async function configureModerationForAccount(
  agent: AtpAgent,
  account: SessionAccount,
) {
  // This global mutation is *only* OK because this code is only relevant for testing.
  // Don't add any other global behavior here!
  switchToAppLabelers()
  if (IS_TEST_USER(account.handle)) {
    await trySwitchToTestAppLabeler(agent)
  }

  // The code below is actually relevant to production (and isn't global).
  const labelerDids = await readLabelers(account.did).catch(_ => {})
  if (labelerDids) {
    agent.configureLabelersHeader(
      labelerDids.filter(did => did !== BSKY_LABELER_DID),
    )
  } else {
    // If there are no headers in the storage, we'll not send them on the initial requests.
    // If we wanted to fix this, we could block on the preferences query here.
  }
}

// northsky: Northsky moderation ships as an app labeler beside Bluesky.
function switchToAppLabelers() {
  AtpAgent.configure({appLabelers: [...APP_LABELER_DIDS]})
}

async function trySwitchToTestAppLabeler(agent: AtpAgent) {
  const did = (
    await agent
      .resolveHandle({handle: 'mod-authority.test'})
      .catch(_ => undefined)
  )?.data.did
  if (did) {
    console.warn('USING TEST ENV MODERATION')
    AtpAgent.configure({appLabelers: [did]})
  }
}
