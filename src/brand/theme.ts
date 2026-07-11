/**
 * Northsky brand themes.
 *
 * Built with ALF's `createTheme` directly from the three hand-authored brand
 * palettes (`palette.ts`) rather than upstream's `createThemes`, because
 * upstream forces `dark = invertPalette(light)` - which can't express the
 * Northsky purple-in-light / mint-in-dark accent or a distinct hand-authored
 * dim.
 *
 * `src/alf/themes.ts` re-points ALF's `themes` at these (one tagged edit), so
 * every consumer - ALF, the legacy `usePalette` files, the theme-color meta tag
 * - picks up the brand automatically.
 */
import {createTheme, type Theme, utils} from '@bsky.app/alf'

import {
  NORTHSKY_DARK_PALETTE,
  NORTHSKY_DIM_PALETTE,
  NORTHSKY_LIGHT_PALETTE,
} from './palette'

/**
 * Rebuild the five `shadow_*` atoms to the pronouns shadow language. `soft`
 * opacity covers xs/sm/md, `strong` covers lg/xl. The `boxShadow` strings match
 * upstream's format (`@bsky.app/alf/dist/themes.js`). Natively we set an opaque
 * `shadowColor` plus an explicit `shadowOpacity`; the alpha'd colors are used
 * only inside the web `boxShadow` strings.
 */
function applyShadows(
  theme: Theme,
  base: string,
  soft: number,
  strong: number,
): Theme {
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
  }),
  NORTHSKY_LIGHT_PALETTE.contrast_1000,
  0.12,
  0.2,
)

const dark = applyShadows(
  createTheme({
    scheme: 'dark',
    name: 'dark',
    palette: NORTHSKY_DARK_PALETTE,
  }),
  NORTHSKY_DARK_PALETTE.black,
  0.4,
  0.55,
)

const dim = applyShadows(
  createTheme({
    scheme: 'dark',
    name: 'dim',
    palette: NORTHSKY_DIM_PALETTE,
  }),
  NORTHSKY_DIM_PALETTE.black,
  0.4,
  0.55,
)

/**
 * Brand themes. Shape matches upstream `createThemes` plus the deprecated
 * `*Palette` accessors, so `src/alf/themes.ts`, `src/brand/index.ts`,
 * `App.tsx`, and `App.web.tsx` need no changes.
 */
export const brandThemes = {
  light,
  dark,
  dim,
  lightPalette: light.palette,
  darkPalette: dark.palette,
  dimPalette: dim.palette,
}
