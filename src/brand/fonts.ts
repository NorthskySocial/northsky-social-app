/**
 * Northsky brand fonts.
 *
 * Body copy uses Geist (variable woff2 for iOS/web, static TTF cuts for
 * Android); the swap lives in `src/alf/fonts.ts`'s theme branch. Display
 * headings use MuseoModerno italic and opt in through the `NS_DISPLAY_FONT`
 * sentinel: `DisplayText` (see `typography.tsx`) sets `fontFamily` to the
 * sentinel, and `applyFonts` intercepts it at the top and routes to
 * `applyDisplayFont` so the display family survives normalization (theme mode
 * otherwise clobbers `fontFamily`).
 *
 * Geist ships no italic cut - on web we lean on synthetic oblique (keep
 * `fontStyle`), on native italic renders upright in theme mode. Likewise
 * MuseoModerno resolves to its static SemiBold cut on native (iOS + Android),
 * so display text there is fixed at ~600 and ignores any caller `fontWeight`
 * override, while the web variable family honors it. `DisplayText` is a
 * fixed-weight brand face on native - override the size, not the weight. This
 * is accepted per the re-theme plan.
 */
import {type TextStyle} from 'react-native'

import {IS_WEB} from '#/env'

/**
 * Sentinel `fontFamily` value that flags a text node as brand display text.
 * Never a real registered family - `applyFonts` swaps it for MuseoModerno.
 */
export const NS_DISPLAY_FONT = 'NorthskyDisplay'

/**
 * Android has no variable Geist - map CSS weights onto the four static cuts
 * shipped in `assets/fonts/geist/`. Mirrors upstream's Inter Android map.
 */
export const GEIST_ANDROID_MAP: Record<string, string> = {
  400: 'Geist-Regular',
  500: 'Geist-Medium',
  600: 'Geist-SemiBold',
  700: 'Geist-Bold',
  800: 'Geist-Bold',
  900: 'Geist-Bold',
}

/**
 * Fallback stack appended to the display family on web only.
 */
const WEB_DISPLAY_FALLBACK = `system-ui, sans-serif`

/**
 * Resolve a text style to MuseoModerno display. Called from `applyFonts` after
 * `fontSize` has already been scaled by `normalizeTextStyles`, so the
 * `letterSpacing` here tracks the final rendered size (0.01em per the pronouns
 * display spec).
 */
export function applyDisplayFont(style: TextStyle) {
  // Brand display is italic by default; a caller may opt out with fontStyle: 'normal'.
  const isItalic = style.fontStyle !== 'normal'

  if (IS_WEB) {
    // Web resolves the variable family through the @font-face descriptors in the
    // HTML shells (which pin italic/normal + a 100-900 weight range), so the
    // requested weight/italic drive the fvar axes; keep a system-ui fallback.
    style.fontFamily = `MuseoModerno, ${WEB_DISPLAY_FALLBACK}`
    style.fontWeight = style.fontWeight || '600'
    if (!style.fontStyle) {
      style.fontStyle = 'italic'
    }
  } else {
    // northsky: native (iOS + Android) resolves the static SemiBold(Italic) cuts
    // by exact PostScript name. The variable woff2's iOS-visible family (name ID
    // 1) is 'MuseoModerno Thin' at fvar default weight 100, and iOS won't
    // reliably drive the wght axis, so a bare `fontFamily: 'MuseoModerno'` can
    // misresolve (San Francisco) or render Thin. The static cuts are already
    // bundled and registered on iOS via the expo-font plugin's top-level `fonts`.
    style.fontFamily = isItalic
      ? 'MuseoModerno-SemiBoldItalic'
      : 'MuseoModerno-SemiBold'
    // fontWeight/fontStyle break the static-cut styling (synthetic weight/slant).
    delete style.fontWeight
    delete style.fontStyle
  }

  const size = typeof style.fontSize === 'number' ? style.fontSize : 16
  style.letterSpacing = 0.01 * size
}
