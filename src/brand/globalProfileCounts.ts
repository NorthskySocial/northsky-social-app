import {type Service} from '@atproto/lex'

import {logger} from '#/logger'
import {type app} from '#/lexicons'
import {type AppView, FALLBACK_APPVIEW} from './appview'

/**
 * Per-call `service` options that target the Bluesky appview. Mirrors the
 * per-call override pattern in `src/brand/searchRouting.ts`.
 */
interface AppviewProxyOpts {
  service: Service
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
  ) => Promise<app.bsky.actor.defs.ProfileViewDetailed>,
): Promise<app.bsky.actor.defs.ProfileViewDetailed> {
  if (appview.did === FALLBACK_APPVIEW.did) {
    return await request()
  }

  const routedPromise = request()
  const blueskyPromise = request({
    service: `${FALLBACK_APPVIEW.did}#bsky_appview`,
  }).catch(error => {
    logger.warn(
      `globalProfileCounts: ${operation} failed on Bluesky; using ${appview.did}`,
      {safeMessage: error},
    )
    return null
  })

  const [routedProfile, blueskyProfile] = await Promise.all([
    routedPromise,
    blueskyPromise,
  ])

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
