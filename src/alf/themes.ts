// northsky: re-point ALF themes at the brand palettes. Imported directly from
// `#/brand/theme` (not the `#/brand` barrel, which pulls in config.ts). This
// rebrands every consumer of `#/alf/themes`, including the legacy `usePalette`
// files and the theme-color meta tag, not just the ALF provider.
import {brandThemes} from '#/brand/theme'

export const themes = {
  lightPalette: brandThemes.light.palette,
  darkPalette: brandThemes.dark.palette,
  dimPalette: brandThemes.dim.palette,
  light: brandThemes.light,
  dark: brandThemes.dark,
  dim: brandThemes.dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = brandThemes.light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = brandThemes.dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = brandThemes.dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const light = brandThemes.light
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dark = brandThemes.dark
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dim = brandThemes.dim
