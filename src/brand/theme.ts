import {type Theme} from '@bsky.app/alf'

import {themes as baseThemes} from '#/alf/themes'

type ThemeOverride = {
  palette?: Partial<Theme['palette']>
  atoms?: Partial<Theme['atoms']>
}

/**
 * Northsky palette overrides. Only the tokens that differ from the base ALF
 * themes are listed here; everything else is inherited.
 *
 * NOTE: we intentionally only override the accent (`primary_500`), not the
 * background. The app's background comes from a coordinated system - ALF's
 * `palette.contrast_*` ramp plus the legacy `src/lib/themes.ts` that drives the
 * web `--background` CSS vars - so overriding a single `atoms.bg` leaves other
 * surfaces (the scroll container, the web body) on the base color and the
 * background flashes white/base on scroll. A fully branded background needs a
 * coherent palette ramp; see src/brand/README.md.
 */
const northskyDark: ThemeOverride = {
  palette: {
    primary_500: '#9A45EC', // primary button background, link text
  },
}

const northskyLight: ThemeOverride = {
  palette: {
    primary_500: '#2AFBBA',
  },
}

function mergeTheme(base: Theme, override?: ThemeOverride): Theme {
  if (!override) return base
  return {
    ...base,
    palette: {...base.palette, ...override.palette},
    atoms: {...base.atoms, ...override.atoms},
  }
}

const mergedLight = mergeTheme(baseThemes.light, northskyLight)
const mergedDark = mergeTheme(baseThemes.dark, northskyDark)
const mergedDim = mergeTheme(baseThemes.dim, northskyDark)

/**
 * Brand themes, ready to pass to the ALF `ThemeProvider` via its
 * `themesOverride` prop. The provider spreads these over the base themes, so
 * each entry must be a complete theme.
 */
export const brandThemes: typeof baseThemes = {
  ...baseThemes,
  light: mergedLight,
  dark: mergedDark,
  dim: mergedDim,
  lightPalette: mergedLight.palette,
  darkPalette: mergedDark.palette,
  dimPalette: mergedDim.palette,
}
