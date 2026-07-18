import {createTheme} from '@bsky.app/alf'
import {describe, expect, it} from '@jest/globals'

import {
  NORTHSKY_DARK_PALETTE,
  NORTHSKY_DIM_PALETTE,
  NORTHSKY_LIGHT_PALETTE,
} from './palette'
import {brandThemes} from './theme'

// applyShadows (theme.ts) re-hardcodes createTheme's shadow_* boxShadow geometry
// (ALF exports no constant for it), swapping only the color. This fails loudly
// if an upstream bump changes that geometry, so we know to re-sync it.
const SHADOW_ATOMS = [
  'shadow_xs',
  'shadow_sm',
  'shadow_md',
  'shadow_lg',
  'shadow_xl',
] as const

// Strip the color token; leave only the box-shadow geometry (offsets/blur/spread).
const geometry = (boxShadow: string) =>
  boxShadow.replace(/hsla\([^)]*\)|rgba\([^)]*\)|#[0-9a-fA-F]+/g, 'C')

describe('brand shadow geometry stays in sync with ALF createTheme', () => {
  const cases: Array<
    [string, (typeof brandThemes)['light'], ReturnType<typeof createTheme>]
  > = [
    [
      'light',
      brandThemes.light,
      createTheme({
        scheme: 'light',
        name: 'light',
        palette: NORTHSKY_LIGHT_PALETTE,
      }),
    ],
    [
      'dark',
      brandThemes.dark,
      createTheme({
        scheme: 'dark',
        name: 'dark',
        palette: NORTHSKY_DARK_PALETTE,
      }),
    ],
    [
      'dim',
      brandThemes.dim,
      createTheme({scheme: 'dark', name: 'dim', palette: NORTHSKY_DIM_PALETTE}),
    ],
  ]

  it.each(cases)(
    '%s brand shadows match upstream geometry',
    (_name, brand, upstream) => {
      for (const atom of SHADOW_ATOMS) {
        expect(geometry(brand.atoms[atom].boxShadow as string)).toBe(
          geometry(upstream.atoms[atom].boxShadow as string),
        )
      }
    },
  )
})
