/**
 * How each brand accent looks under the "Accents" setting. `lively` is the
 * signature gradient from `gradients.ts`. `calm` swaps it for the style
 * guide's solid button purple and a quiet hairline ring, so the app reads
 * closer to upstream for people who find the gradient too bright.
 */
import {useTheme} from '#/alf'
import {web} from '#/alf/util/platform'
import {
  gradientBorderWeb,
  NAV_WASH_TINT,
  navItemHoverWash,
} from '#/brand/gradients'
import {NORTHSKY_LIGHT_PALETTE} from '#/brand/palette'
import {type Accents, useAccents} from '#/features/northskyAppearance'

/**
 * Calm primary-button and compose-button fill: the style guide's "Press
 * Button" purple, the same in every theme. White label text on it is ~4.7:1,
 * so it needs none of the text-shadow scrim the gradient needs.
 */
export const CALM_ACCENT = NORTHSKY_LIGHT_PALETTE.primary_500
export const CALM_ACCENT_HOVER = NORTHSKY_LIGHT_PALETTE.primary_600

/** Calm rings are a hairline, like upstream's frames, not the 2px gradient. */
export const CALM_RING_WIDTH = 1

export function useIsLively() {
  return useAccents() === 'lively'
}

/**
 * Web-only frame for menus and dialogs. Lively is the padding-box/border-box
 * gradient trick; calm is a plain solid border. Both paint `bgColor` as the
 * fill, since the gradient variant relies on its `background` shorthand for
 * that.
 */
export function brandBorderWeb(
  accents: Accents,
  {
    bgColor,
    ringColor,
    gradientWidth = 2,
  }: {bgColor: string; ringColor: string; gradientWidth?: number},
) {
  if (accents === 'lively') {
    return gradientBorderWeb(bgColor, gradientWidth)
  }
  return web({
    backgroundColor: bgColor,
    borderWidth: CALM_RING_WIDTH,
    borderColor: ringColor,
    borderStyle: 'solid',
  })
}

/** `brandBorderWeb` for the current setting, ringed in the theme's low-contrast border. */
export function useBrandBorderWeb(bgColor: string, gradientWidth?: number) {
  const t = useTheme()
  return brandBorderWeb(useAccents(), {
    bgColor,
    ringColor: t.atoms.border_contrast_low.borderColor,
    gradientWidth,
  })
}

export function navHoverWash(accents: Accents) {
  if (accents === 'lively') {
    return navItemHoverWash
  }
  return {backgroundColor: NAV_WASH_TINT}
}

export function useNavHoverWash() {
  return navHoverWash(useAccents())
}
