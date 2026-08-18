import {type AppBskyActorDefs, type AppBskyActorGetProfile} from '@atproto/api'

import {logger} from '#/logger'
import {type AppView, FALLBACK_APPVIEW} from './appview'

interface AppviewProxyOpts {
  headers: {'atproto-proxy': string}
}

/**
 * Keep the routed appview's profile and viewer state, but prefer Bluesky's
 * global counts and known followers when they are available.
 */
export async function getProfileWithGlobalCounts(
  appview: AppView,
  operation: string,
  request: (
    opts?: AppviewProxyOpts,
  ) => Promise<AppBskyActorGetProfile.Response>,
): Promise<AppBskyActorDefs.ProfileViewDetailed> {
  if (appview.did === FALLBACK_APPVIEW.did) {
    return (await request()).data
  }

  const routedPromise = request()
  const blueskyPromise = request({
    headers: {
      'atproto-proxy': `${FALLBACK_APPVIEW.did}#bsky_appview`,
    },
  }).catch(error => {
    logger.warn(
      `globalProfileCounts: ${operation} failed on Bluesky; using ${appview.did}`,
      {safeMessage: error},
    )
    return null
  })

  const [routedResponse, blueskyResponse] = await Promise.all([
    routedPromise,
    blueskyPromise,
  ])
  const routedProfile = routedResponse.data
  const blueskyProfile = blueskyResponse?.data

  if (!blueskyProfile) {
    return routedProfile
  }

  return {
    ...routedProfile,
    followersCount:
      blueskyProfile.followersCount ?? routedProfile.followersCount,
    followsCount: blueskyProfile.followsCount ?? routedProfile.followsCount,
    postsCount: blueskyProfile.postsCount ?? routedProfile.postsCount,
    viewer: blueskyProfile.viewer?.knownFollowers
      ? {
          ...routedProfile.viewer,
          knownFollowers: blueskyProfile.viewer.knownFollowers,
        }
      : routedProfile.viewer,
  }
}
