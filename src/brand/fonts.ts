import {type TextStyle} from 'react-native'

import {IS_WEB} from '#/env'

export const NS_DISPLAY_FONT = 'NorthskyDisplay'

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
