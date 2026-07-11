import {createTheme} from '@bsky.app/alf'
import {describe, expect, it} from '@jest/globals'

import {
  NORTHSKY_DARK_PALETTE,
  NORTHSKY_DIM_PALETTE,
  NORTHSKY_LIGHT_PALETTE,
} from './palette'
import {brandThemes} from './theme'

// northsky: applyShadows (theme.ts) re-hardcodes the five shadow_* boxShadow
// geometry strings that ALF's createTheme also emits, swapping only the color
// so the brand can use an ink/deeper base and a two-tier soft/strong opacity
// that createTheme's single shadowOpacity option cannot express. ALF exports no
// geometry constant to import, so this test fails loudly if an upstream bump
// changes the shadow geometry, forcing us to re-sync the copied strings.
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
