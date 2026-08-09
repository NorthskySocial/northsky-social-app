import {type TextStyle} from 'react-native'

import {IS_ANDROID, IS_WEB} from '#/env'

export const NS_DISPLAY_FONT = 'NorthskyDisplay'

/**
 * Body italic family. Geist ships no italic cut, so the variable italic in
 * `assets/fonts/geist/Geist-Italic.ttf` is registered as its own family.
 * Browsers synthesize oblique from the upright face, but native cannot, so this
 * is only applied off-web.
 */
export const GEIST_ITALIC_FONT = 'Geist-Italic'

/**
 * Monospace family for rendered code (inline code and fenced blocks). A full
 * fallback stack on web; a single system family on native, since RN
 * `fontFamily` does not accept CSS-style fallback lists. `applyFonts` preserves
 * this verbatim - see the guard there - so the body font does not clobber it
 * and leave code in a proportional typeface.
 */
export const MONOSPACE_FONT_FAMILY = IS_WEB
  ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Roboto Mono", monospace'
  : IS_ANDROID
    ? 'monospace'
    : 'Menlo'

/** Android has no variable Geist - maps CSS weights onto the static cuts in `assets/fonts/geist/`. */
export const GEIST_ANDROID_MAP: Record<string, string> = {
  400: 'Geist-Regular',
  500: 'Geist-Medium',
  600: 'Geist-SemiBold',
  700: 'Geist-Bold',
  800: 'Geist-Bold',
  900: 'Geist-Bold',
}

/** Appended to the display family on web only. */
const WEB_DISPLAY_FALLBACK = `system-ui, sans-serif`

export function applyDisplayFont(style: TextStyle) {
  // Brand display is italic by default; a caller may opt out with fontStyle: 'normal'.
  const isItalic = style.fontStyle !== 'normal'

  if (IS_WEB) {
    style.fontFamily = `MuseoModerno, ${WEB_DISPLAY_FALLBACK}`
    style.fontWeight = style.fontWeight || '600'
    if (!style.fontStyle) {
      style.fontStyle = 'italic'
    }
  } else {
    style.fontFamily = isItalic
      ? 'MuseoModerno-SemiBoldItalic'
      : 'MuseoModerno-SemiBold'
    delete style.fontWeight
    delete style.fontStyle
  }

  const size = typeof style.fontSize === 'number' ? style.fontSize : 16
  style.letterSpacing = 0.01 * size
}
