import {AtpAgent, BSKY_LABELER_DID} from '@atproto/api'
import {beforeEach, describe, expect, it, jest} from '@jest/globals'

import {readLabelers} from '../agent-config'
import {
  configureModerationForAccount,
  configureModerationForGuest,
} from '../moderation'
import {type SessionAccount} from '../types'

jest.mock('../agent-config', () => ({
  readLabelers: jest.fn(),
}))

const mockReadLabelers = readLabelers as jest.MockedFunction<
  typeof readLabelers
>

const NORTHSKY_MOD_DID = 'did:plc:p2cxrw3ank4dzs55mpm6ohq4'

function makeAccount(): SessionAccount {
  return {
    did: 'did:plc:testaccount',
    handle: 'nadia.northsky.social',
    service: 'https://northsky.social',
    refreshJwt: undefined,
    accessJwt: undefined,
  }
}

function makeAgent() {
  return {
    configureLabelersHeader: jest.fn(),
  } as unknown as AtpAgent
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReadLabelers.mockResolvedValue(undefined)
  /*
   * `AtpAgent.appLabelers` is static global state that these tests mutate.
   * Clear it so each test must configure it, and cannot pass on the value the
   * test before it set.
   */
  AtpAgent.configure({appLabelers: []})
})

describe('app labelers', () => {
  it('applies Northsky moderation ahead of Bluesky for guests', () => {
    configureModerationForGuest()
    expect(AtpAgent.appLabelers).toEqual([NORTHSKY_MOD_DID, BSKY_LABELER_DID])
  })

  it('applies Northsky moderation for logged-in accounts', async () => {
    await configureModerationForAccount(makeAgent(), makeAccount())
    expect(AtpAgent.appLabelers).toEqual([NORTHSKY_MOD_DID, BSKY_LABELER_DID])
  })
})
