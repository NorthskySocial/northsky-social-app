import {Client} from '@atproto/lex'
import {api} from '@bsky/sdk'
import {beforeEach, describe, expect, it, jest} from '@jest/globals'

import {
  configureModerationForAccount,
  configureModerationForGuest,
} from '../moderation'
import {makeAccount} from './mock-fetch'

const NORTHSKY_MOD_DID = 'did:plc:p2cxrw3ank4dzs55mpm6ohq4'

/*
 * The handle must not match IS_TEST_USER, so the test-labeler resolution
 * path stays dormant and no network call is attempted.
 */
function makeNorthskyAccount() {
  return makeAccount({
    handle: 'nadia.northsky.social',
    service: 'https://northsky.social',
  })
}

function makeBundle() {
  return {
    appviewClient: {
      setLabelers: jest.fn(),
      call: jest.fn(),
    } as unknown as Client,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  /*
   * `Client.appLabelers` is static global state that these tests mutate.
   * Clear it so each test must configure it, and cannot pass on the value the
   * test before it set.
   */
  Client.configure({appLabelers: []})
})

describe('app labelers', () => {
  it('applies Northsky moderation ahead of Bluesky for guests', () => {
    configureModerationForGuest()
    expect(Client.appLabelers).toEqual([NORTHSKY_MOD_DID, api.moderation.did])
  })

  it('applies Northsky moderation for logged-in accounts', () => {
    configureModerationForAccount(makeBundle(), makeNorthskyAccount())
    expect(Client.appLabelers).toEqual([NORTHSKY_MOD_DID, api.moderation.did])
  })
})
