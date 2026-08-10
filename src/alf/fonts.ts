import {type FontVariant, type TextStyle} from 'react-native'

// northsky: brand fonts (Geist body + MuseoModerno display sentinel)
import {
  applyDisplayFont,
  GEIST_ANDROID_MAP,
  GEIST_ITALIC_FONT,
  MONOSPACE_FONT_FAMILY,
  NS_DISPLAY_FONT,
} from '#/brand/fonts'
import {IS_ANDROID, IS_WEB} from '#/env'
import {type Device, device} from '#/storage'

const WEB_FONT_FAMILIES = `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`

const factor = 0.0625 // 1 - (15/16)
const fontScaleMultipliers: Record<Device['fontScale'], number> = {
  '-2': 1 - factor * 1, // unused
  '-1': 1 - factor * 1,
  '0': 1, // default
  '1': 1 + factor * 1,
  '2': 1 + factor * 1, // unused
}

export function computeFontScaleMultiplier(scale: Device['fontScale']) {
  return fontScaleMultipliers[scale]
}

export function getFontScale() {
  return device.get(['fontScale']) ?? '0'
}

export function setFontScale(fontScale: Device['fontScale']) {
  device.set(['fontScale'], fontScale)
}

export function getFontFamily() {
  return device.get(['fontFamily']) || 'theme'
}

export function setFontFamily(fontFamily: Device['fontFamily']) {
  device.set(['fontFamily'], fontFamily)
}

/*
 * Unused fonts are commented out, but the files are there if we need them.
 */
export function applyFonts(style: TextStyle, fontFamily: 'system' | 'theme') {
  // northsky: brand display text opts in via the NS_DISPLAY_FONT sentinel;
  // route it to MuseoModerno regardless of the theme/system font setting.
  if (style.fontFamily === NS_DISPLAY_FONT) {
    applyDisplayFont(style)
    return
  }
  // northsky: preserve an explicitly requested monospace family (code blocks);
  // the branches below would otherwise overwrite it with the body font.
  if (style.fontFamily === MONOSPACE_FONT_FAMILY) return
  if (fontFamily === 'theme') {
    if (IS_ANDROID) {
      if (style.fontStyle === 'italic') {
        // northsky: Our Geist font is missing italic so we have a separate file
        // causing conflicts because now the families match so we load it directly
        style.fontFamily = GEIST_ITALIC_FONT
        delete style.fontStyle
      } else {
        // northsky: Geist static cuts replace Inter. The family name carries
        // the weight here, so fontWeight would only double-apply.
        style.fontFamily =
          GEIST_ANDROID_MAP[String(style.fontWeight || '400')] ||
          'Geist-Regular'

        /*
         * These are not supported on Android and actually break the styling.
         */
        delete style.fontWeight
        delete style.fontStyle
      }
    } else if (!IS_WEB && style.fontStyle === 'italic') {
      // northsky: iOS cannot synthesize oblique from the upright face the way
      // browsers do, so italic uses the dedicated family and drops the flag.
      style.fontFamily = GEIST_ITALIC_FONT
      delete style.fontStyle
    } else {
      // northsky: Geist variable body font; keep fontStyle so web synthesizes
      // oblique (Geist has no italic cut).
      style.fontFamily = 'Geist'
    }

    if (IS_WEB) {
      // fallback families only supported on web
      style.fontFamily += `, ${WEB_FONT_FAMILIES}`
    }

    /**
     * northsky: disable contextual alternates and emoji overrides in the body
     * font (Geist; upstream targeted Inter)
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant}
     */
    if (IS_WEB) {
      style.fontVariant = (style.fontVariant || []).concat(
        'no-contextual',
        'unicode' as FontVariant, // web supports 'unicode' as a valid value for fontVariant
      )
    } else {
      style.fontVariant = (style.fontVariant || []).concat('no-contextual')
    }
  } else {
    // fallback families only supported on web
    if (IS_WEB) {
      style.fontFamily = style.fontFamily || WEB_FONT_FAMILIES
    }

    /**
     * Overridden to previous spacing for the `system` font option.
     * https://github.com/bluesky-social/social-app/commit/2419096e2409008b7d71fd6b8f8d0dd5b016e267
     */
    style.letterSpacing = 0.25
  }
}

/**
 * Here only for bundling purposes, not actually used.
 */
export {DO_NOT_USE} from '#/alf/util/unusedUseFonts'
