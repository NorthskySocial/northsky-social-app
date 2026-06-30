import {type Theme} from '@bsky.app/alf'

import {themes as baseThemes} from '#/alf/themes'

type ThemeOverride = {
  palette?: Partial<Theme['palette']>
  atoms?: Partial<Theme['atoms']>
}

/**
 * Northsky palette/atoms overrides. Only the tokens that differ from the base
 * ALF themes are listed here; everything else is inherited.
 */
const northskyDark: ThemeOverride = {
  palette: {
    primary_500: '#9A45EC', // primary button background, link text
  },
  atoms: {
    bg: {backgroundColor: '#1F0B35'},
  },
}

const northskyLight: ThemeOverride = {
  palette: {
    primary_500: '#2AFBBA',
  },
  atoms: {
    bg: {backgroundColor: '#DFE1E3'},
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
