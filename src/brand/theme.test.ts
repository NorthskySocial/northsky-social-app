import {createTheme} from '@bsky.app/alf'
import {describe, expect, it} from '@jest/globals'

import {contrastRatio} from '#/alf/util/colorGeneration'
import {
  NORTHSKY_BLACK_PALETTE,
  NORTHSKY_DARK_PALETTE,
  NORTHSKY_DIM_PALETTE,
  NORTHSKY_LIGHT_PALETTE,
} from './palette'
import {BLACK_THEMES_OVERRIDE, brandThemes, isBlackTheme} from './theme'

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
    [
      'black',
      brandThemes.black,
      createTheme({
        scheme: 'dark',
        name: 'dark',
        palette: NORTHSKY_BLACK_PALETTE,
      }),
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

describe('black theme', () => {
  it('has a true-black background', () => {
    expect(brandThemes.black.atoms.bg.backgroundColor).toBe('#000000')
  })

  /*
   * Black keeps the ALF name `dark`, so upstream `t.name` checks and
   * `select(t.name, ...)` calls treat it as dark.
   */
  it('keeps the dark theme name and scheme', () => {
    expect(brandThemes.black.name).toBe('dark')
    expect(brandThemes.black.scheme).toBe('dark')
  })

  it('overrides only the dark theme', () => {
    expect(Object.keys(BLACK_THEMES_OVERRIDE).sort()).toEqual([
      'dark',
      'darkPalette',
    ])
    expect(BLACK_THEMES_OVERRIDE.dark).toBe(brandThemes.black)
  })

  it.each([
    ['text', 'contrast_1000', 7],
    ['medium text', 'contrast_700', 4.5],
    ['low text', 'contrast_500', 4.5],
    ['accent', 'primary_500', 4.5],
  ] as const)('%s on the background meets %s:1', (_name, key, min) => {
    const bg = NORTHSKY_BLACK_PALETTE.contrast_0
    expect(contrastRatio(NORTHSKY_BLACK_PALETTE[key], bg)).toBeGreaterThan(min)
  })

  /*
   * Hairline borders (and calm-accent frames, e.g. around quote posts) use
   * `contrast_100`. On black they must stand out at least as well as dark's
   * borders do on dark's background.
   */
  it('keeps borders as visible as in dark', () => {
    const black = contrastRatio(
      NORTHSKY_BLACK_PALETTE.contrast_100,
      NORTHSKY_BLACK_PALETTE.contrast_0,
    )!
    const dark = contrastRatio(
      NORTHSKY_DARK_PALETTE.contrast_100,
      NORTHSKY_DARK_PALETTE.contrast_0,
    )!
    expect(black).toBeGreaterThanOrEqual(dark)
  })

  it('steps surfaces up from black', () => {
    const steps = [
      'contrast_0',
      'contrast_25',
      'contrast_50',
      'contrast_100',
      'contrast_200',
      'contrast_300',
    ] as const
    const ratios = steps.map(k =>
      contrastRatio(NORTHSKY_BLACK_PALETTE[k], '#000000'),
    )
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]!).toBeGreaterThan(ratios[i - 1]!)
    }
  })
})

describe('isBlackTheme', () => {
  it('is true only for a dark theme with Black chosen', () => {
    expect(isBlackTheme('dark', 'black')).toBe(true)
    expect(isBlackTheme('dark', 'dark')).toBe(false)
    expect(isBlackTheme('dim', 'dim')).toBe(false)
    expect(isBlackTheme('dark', undefined)).toBe(false)
  })

  /* Black chosen, but light mode (or system light) is showing. */
  it('is false while the light theme shows', () => {
    expect(isBlackTheme('light', 'black')).toBe(false)
  })
})
