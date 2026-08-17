import {logger} from '#/logger'
import {type AppView, FALLBACK_APPVIEW} from '#/brand/appview'
import {account} from '#/storage'

/**
 * Per-call `atproto-proxy` options that target the fallback appview. Mutes
 * are private appview state, so a write through the routed appview is not
 * visible on the fallback. Callers replay each mute write with these options
 * to keep both appviews in step.
 */
export interface FallbackProxyOpts {
  headers: {'atproto-proxy': string}
}

/**
 * Mute sync is a beta feature. The account must have beta features enabled
 * (`bskyAppState.isBetaUser`, cached per account in device storage by
 * `BetaUserStorageSync` and the beta settings toggle). The cache is the only
 * synchronous source available at session start, before preferences load.
 */
function isBetaUser(did: string | undefined): boolean {
  return did !== undefined && account.get([did, 'isBetaUser']) === true
}

/**
 * Returns per-call proxy options for the fallback appview, or null when the
 * account has not enabled beta features or the routed appview does not opt
 * in via `syncMutesWithFallback`. The opt-in keeps dev appviews from writing
 * to production. Mirrors the per-call override pattern in
 * `src/brand/searchRouting.ts`.
 */
export function fallbackProxyOpts(
  appview: AppView,
  did: string | undefined,
): FallbackProxyOpts | null {
  if (
    !isBetaUser(did) ||
    !appview.syncMutesWithFallback ||
    appview.did === FALLBACK_APPVIEW.did
  ) {
    return null
  }
  return {
    headers: {'atproto-proxy': `${FALLBACK_APPVIEW.did}#bsky_appview`},
  }
}

/**
 * Replays a mute write against the fallback appview, best-effort. The
 * primary write to the routed appview must already have succeeded. A replay
 * failure is logged and swallowed; session-start reconciliation heals the
 * gap later.
 */
export async function replayMuteWriteToFallback(
  appview: AppView,
  did: string | undefined,
  replay: (opts: FallbackProxyOpts) => Promise<unknown>,
): Promise<void> {
  const opts = fallbackProxyOpts(appview, did)
  if (!opts) {
    return
  }
  try {
    await replay(opts)
    logger.info('muteSync: replayed a mute write to the fallback appview')
  } catch (e) {
    logger.warn('muteSync: mute replay to the fallback appview failed', {
      safeMessage: e,
    })
  }
}
