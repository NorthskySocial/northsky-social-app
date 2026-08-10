import {
  ageAssuranceRuleIDs as ids,
  type AppBskyAgeassuranceDefs,
} from '@atproto/api'

import {AgeAssuranceAccess} from '#/ageAssurance/types'
import {BRAND} from '#/brand/config'
import {
  ANDROID_API_LEVEL,
  IOS_MAJOR_VERSION,
  IS_ANDROID,
  IS_IOS,
  IS_WEB,
} from '#/env'

/**
 * northsky: whether the age assurance system is active. This flag controls the
 * verified-access side only. Northsky does not operate the
 * `app.bsky.ageassurance.*` endpoints that this system reads, so the upstream
 * default leaves every account at `safe` access and disables chat.
 *
 * When this flag is off, `computeAgeAssuranceState` grants each signed-in
 * account full access. All age assurance banners, dialogs and block screens
 * then stay hidden, because each one tests for less than full access.
 *
 * Logged-out visitors keep their safe moderation defaults either way, because
 * those defaults are not an age assurance rule.
 *
 * Set `ageAssurance.enabled` to `true` in `src/brand/brand.json` to restore
 * the upstream behavior.
 */
export const AGE_ASSURANCE_ENABLED: boolean = BRAND.ageAssurance.enabled

/**
 * northsky: whether the declared age gates adult content and group chat. The
 * declared age comes from the birthdate on the account, not from age
 * assurance, so this flag is independent of {@link AGE_ASSURANCE_ENABLED}.
 *
 * When this flag is off, `computeAgeAssuranceFlags` reports every account as
 * over the adult age. The flags still report the declared age itself, so
 * screens that only read or edit the birthdate keep working.
 *
 * Turning this off removes the last client-side adult content gate. Keep it on
 * unless the service enforces the same rule somewhere else.
 *
 * Set `ageAssurance.adultAgeGateEnabled` to `true` in `src/brand/brand.json`
 * to restore the upstream behavior.
 */
export const ADULT_AGE_GATE_ENABLED: boolean =
  BRAND.ageAssurance.adultAgeGateEnabled

/**
 * Minimum age required to access the app at all.
 */
export const MIN_ACCESS_AGE = 13

/**
 * The identifier for the current platform, matching the `knownValues` of the
 * `platforms` property on `app.bsky.ageassurance.defs#configRegion`. Used to
 * filter out region configs that don't apply to this platform.
 */
export const AGE_ASSURANCE_PLATFORM: 'web' | 'ios' | 'android' = IS_WEB
  ? 'web'
  : IS_IOS
    ? 'ios'
    : 'android'

/**
 * Whether the current device can provide the native on-device age signals we
 * use for age assurance (via `expo-age-range`). We gate on OS version because
 * the underlying platform APIs are only available on:
 *
 * - iOS 26.0+ (Declared Age Range API)
 *   https://developer.apple.com/documentation/declaredagerange/
 * - Android 6.0 / API level 23+ (Play Age Signals API)
 *   https://developer.android.com/google/play/age-signals/use-age-signals-api
 *
 * On unsupported platforms/versions (including web) this is `false`, so we skip
 * the device flow and fall back to KWS.
 */
export const DEVICE_SIGNALS_SUPPORTED: boolean =
  (IS_IOS && IOS_MAJOR_VERSION >= 26) || (IS_ANDROID && ANDROID_API_LEVEL >= 23)

export const FALLBACK_REGION_CONFIG: AppBskyAgeassuranceDefs.ConfigRegion = {
  countryCode: '*',
  regionCode: undefined,
  minAccessAge: MIN_ACCESS_AGE,
  rules: [
    {
      $type: ids.IfDeclaredOverAge,
      age: MIN_ACCESS_AGE,
      access: AgeAssuranceAccess.Full,
    },
    {
      $type: ids.Default,
      access: AgeAssuranceAccess.None,
    },
  ],
}
