import {type AppBskyActorGetProfile} from '@atproto/api'

import {type AppView, FALLBACK_APPVIEW} from '../appview'
import {getProfileWithGlobalCounts} from '../globalProfileCounts'

jest.mock('#/logger')

const BLACKSKY_APPVIEW: AppView = {
  url: 'https://api.blacksky.community',
  did: 'did:web:api.blacksky.community',
}

function response(
  data: AppBskyActorGetProfile.OutputSchema,
): AppBskyActorGetProfile.Response {
  return {
    success: true,
    headers: {},
    data,
  }
}

const BLACKSKY_PROFILE = response({
  did: 'did:plc:profile',
  handle: 'profile.test',
  displayName: 'Blacksky name',
  followersCount: 5_716,
  followsCount: 4_167,
  postsCount: 47_404,
  viewer: {
    muted: true,
  },
})

const BLUESKY_PROFILE = response({
  did: 'did:plc:profile',
  handle: 'profile.test',
  displayName: 'Bluesky name',
  followersCount: 8_764,
  followsCount: 2_138,
  postsCount: 47_558,
  viewer: {
    knownFollowers: {
      count: 1,
      followers: [],
    },
  },
})

describe('getProfileWithGlobalCounts', () => {
  it('merges Bluesky counts into the routed profile', async () => {
    const request = jest
      .fn<
        Promise<AppBskyActorGetProfile.Response>,
        [opts?: {headers: {'atproto-proxy': string}}]
      >()
      .mockResolvedValueOnce(BLACKSKY_PROFILE)
      .mockResolvedValueOnce(BLUESKY_PROFILE)

    await expect(
      getProfileWithGlobalCounts(BLACKSKY_APPVIEW, 'getProfile', request),
    ).resolves.toMatchObject({
      displayName: 'Blacksky name',
      followersCount: 8_764,
      followsCount: 2_138,
      postsCount: 47_558,
      viewer: {
        muted: true,
        knownFollowers: {
          count: 1,
        },
      },
    })
    expect(request).toHaveBeenNthCalledWith(1)
    expect(request).toHaveBeenNthCalledWith(2, {
      headers: {
        'atproto-proxy': `${FALLBACK_APPVIEW.did}#bsky_appview`,
      },
    })
  })

  it('uses the routed profile when Bluesky fails', async () => {
    const request = jest
      .fn<
        Promise<AppBskyActorGetProfile.Response>,
        [opts?: {headers: {'atproto-proxy': string}}]
      >()
      .mockResolvedValueOnce(BLACKSKY_PROFILE)
      .mockRejectedValueOnce(new Error('Bluesky unavailable'))

    await expect(
      getProfileWithGlobalCounts(BLACKSKY_APPVIEW, 'getProfile', request),
    ).resolves.toBe(BLACKSKY_PROFILE.data)
  })

  it('uses one request when the routed appview is Bluesky', async () => {
    const request = jest.fn().mockResolvedValue(BLUESKY_PROFILE)

    await expect(
      getProfileWithGlobalCounts(FALLBACK_APPVIEW, 'getProfile', request),
    ).resolves.toBe(BLUESKY_PROFILE.data)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith()
  })
})
