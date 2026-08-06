/**
 * Built with ALF's `createTheme` directly from the three brand palettes,
 * rather than upstream's `createThemes` (which forces `dark =
 * invertPalette(light)` and can't express purple-in-light / mint-in-dark).
 * `src/alf/themes.ts` re-points at `brandThemes` so all consumers pick it up.
 */
import {createTheme, type Theme, utils} from '@bsky.app/alf'

import {
  NORTHSKY_DARK_PALETTE,
  NORTHSKY_DIM_PALETTE,
  NORTHSKY_LIGHT_PALETTE,
  type NorthskyPalette,
} from './palette'

// northsky: theme type with our custom palette
export type NorthskyTheme = Omit<Theme, 'palette'> & {palette: NorthskyPalette}

/**
 * Rebuilds the five `shadow_*` atoms to the brand shadow language: `soft`
 * opacity covers xs/sm/md, `strong` covers lg/xl. `boxShadow` format matches
 * upstream (`@bsky.app/alf/dist/themes.js`); native gets an opaque
 * `shadowColor` + `shadowOpacity` instead, since alpha'd colors are only used
 * in the web boxShadow strings.
 */
function applyShadows(
  theme: NorthskyTheme,
  base: string,
  soft: number,
  strong: number,
): NorthskyTheme {
  const s = utils.alpha(base, soft)
  const l = utils.alpha(base, strong)
  return {
    ...theme,
    atoms: {
      ...theme.atoms,
      shadow_xs: {
        ...theme.atoms.shadow_xs,
        shadowColor: base,
        shadowOpacity: soft,
        boxShadow: `0 2px 8px 0 ${s}`,
      },
      shadow_sm: {
        ...theme.atoms.shadow_sm,
        shadowColor: base,
        shadowOpacity: soft,
        boxShadow: `0 4px 6px -1px ${s}, 0 2px 4px -2px ${s}`,
      },
      shadow_md: {
        ...theme.atoms.shadow_md,
        shadowColor: base,
        shadowOpacity: soft,
        boxShadow: `0 10px 15px -3px ${s}, 0 4px 6px -4px ${s}`,
      },
      shadow_lg: {
        ...theme.atoms.shadow_lg,
        shadowColor: base,
        shadowOpacity: strong,
        boxShadow: `0 20px 25px -5px ${l}, 0 8px 10px -6px ${l}`,
      },
      shadow_xl: {
        ...theme.atoms.shadow_xl,
        shadowColor: base,
        shadowOpacity: strong,
        boxShadow: `0 10px 40px 0 ${l}`,
      },
    },
  }
}

// Light: ink-tinted shadows. Dark/dim: deeper black shadows.
const light = applyShadows(
  createTheme({
    scheme: 'light',
    name: 'light',
    palette: NORTHSKY_LIGHT_PALETTE,
  }) as NorthskyTheme,
  NORTHSKY_LIGHT_PALETTE.contrast_1000,
  0.12,
  0.2,
)

const dark = applyShadows(
  createTheme({
    scheme: 'dark',
    name: 'dark',
    palette: NORTHSKY_DARK_PALETTE,
  }) as NorthskyTheme,
  NORTHSKY_DARK_PALETTE.black,
  0.4,
  0.55,
)

const dim = applyShadows(
  createTheme({
    scheme: 'dark',
    name: 'dim',
    palette: NORTHSKY_DIM_PALETTE,
  }) as NorthskyTheme,
  NORTHSKY_DIM_PALETTE.black,
  0.4,
  0.55,
)

/** Shape matches upstream `createThemes`'s output, so consumers need no changes. */
export const brandThemes = {
  light,
  dark,
  dim,
  lightPalette: light.palette,
  darkPalette: dark.palette,
  dimPalette: dim.palette,
}
