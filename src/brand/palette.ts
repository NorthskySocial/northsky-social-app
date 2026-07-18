/**
 * The three ALF `Palette` objects (light/dark/dim), hand-authored to the
 * Northsky design language. Dark is authored pre-inverted (`contrast_0` is
 * the background) since these feed `createTheme` directly, not
 * `invertPalette`; dim is a distinct softer dark, not a copy of dark.
 *
 * `positive_*` and the static keys (white/black/pink/yellow/like) are pulled
 * live from the package (`DEFAULT_PALETTE`/`DEFAULT_SUBDUED_PALETTE`/
 * `invertPalette`) so they never drift from upstream green. `negative_*` is
 * the Northsky error red expanded to a full ramp.
 */
import {type Palette} from '@bsky.app/alf'
// northsky: not re-exported from the package root, so reach into `palette` directly.
import {
  DEFAULT_PALETTE,
  DEFAULT_SUBDUED_PALETTE,
  invertPalette,
} from '@bsky.app/alf/dist/palette'

// Theme-invariant keys, taken verbatim from the package.
const STATIC = {
  white: DEFAULT_PALETTE.white,
  black: DEFAULT_PALETTE.black,
  pink: DEFAULT_PALETTE.pink,
  yellow: DEFAULT_PALETTE.yellow,
  like: DEFAULT_PALETTE.like,
}

type PositiveRamp = Pick<
  Palette,
  | 'positive_25'
  | 'positive_50'
  | 'positive_100'
  | 'positive_200'
  | 'positive_300'
  | 'positive_400'
  | 'positive_500'
  | 'positive_600'
  | 'positive_700'
  | 'positive_800'
  | 'positive_900'
  | 'positive_950'
  | 'positive_975'
>

function pickPositive(p: Palette): PositiveRamp {
  return {
    positive_25: p.positive_25,
    positive_50: p.positive_50,
    positive_100: p.positive_100,
    positive_200: p.positive_200,
    positive_300: p.positive_300,
    positive_400: p.positive_400,
    positive_500: p.positive_500,
    positive_600: p.positive_600,
    positive_700: p.positive_700,
    positive_800: p.positive_800,
    positive_900: p.positive_900,
    positive_950: p.positive_950,
    positive_975: p.positive_975,
  }
}

export const NORTHSKY_LIGHT_PALETTE: Palette = {
  ...STATIC,

  contrast_0: '#FFFFFF',
  contrast_25: '#F7F7FD',
  contrast_50: '#EFF0FB',
  contrast_100: '#E1DFF0',
  contrast_200: '#C8C4DE',
  contrast_300: '#AFA8CB',
  contrast_400: '#948BB4',
  contrast_500: '#796D96',
  contrast_600: '#655A80',
  contrast_700: '#52476C',
  contrast_800: '#423658',
  contrast_900: '#322447',
  contrast_950: '#2A1B3E',
  contrast_975: '#241238',
  contrast_1000: '#1F0B35',

  primary_25: '#FBF8FE',
  primary_50: '#F7F0FD',
  primary_100: '#EFE1FC',
  primary_200: '#DFC3F9',
  primary_300: '#CA9EF5',
  primary_400: '#B272F1',
  primary_500: '#9A45EC',
  primary_600: '#8139C6',
  primary_700: '#6B2FA4',
  primary_800: '#542482',
  primary_900: '#3E1960',
  primary_950: '#30134B',
  primary_975: '#250E3A',

  // upstream DEFAULT_PALETTE positive ramp
  ...pickPositive(DEFAULT_PALETTE),

  negative_25: '#FEF6F6',
  negative_50: '#FCEDED',
  negative_100: '#FADADB',
  negative_200: '#F6BFC1',
  negative_300: '#F19A9D',
  negative_400: '#EB7074',
  negative_500: '#E5484D',
  negative_600: '#C93E43',
  negative_700: '#AD343A',
  negative_800: '#8B272E',
  negative_900: '#6D1D24',
  negative_950: '#57141C',
  negative_975: '#460E17',
}

export const NORTHSKY_DARK_PALETTE: Palette = {
  ...STATIC,

  contrast_0: '#1F0B35',
  contrast_25: '#281243',
  contrast_50: '#2B1548', // raised surface
  contrast_100: '#3A2559',
  contrast_200: '#4A366B',
  contrast_300: '#5B487D',
  contrast_400: '#7A6899',
  contrast_500: '#907FA9',
  contrast_600: '#A497B8',
  contrast_700: '#BCB1CC',
  contrast_800: '#D2CADE',
  contrast_900: '#E7E2EF',
  contrast_950: '#F2EFF7',
  contrast_975: '#F9F7FB',
  contrast_1000: '#FFFFFF',

  primary_25: '#201A3D',
  primary_50: '#202845',
  primary_100: '#214152',
  primary_200: '#236064',
  primary_300: '#258578',
  primary_400: '#27BB95',
  primary_500: '#2AFFBA',
  primary_600: '#5FFFCB',
  primary_700: '#8AFFD9',
  primary_800: '#AEFFE5',
  primary_900: '#D0FFF0',
  primary_950: '#E5FFF7',
  primary_975: '#F2FFFB',

  // upstream DEFAULT_PALETTE positive ramp inverted (upstream's own dark values)
  ...pickPositive(invertPalette(DEFAULT_PALETTE)),

  // light negative ramp reversed (500 stays #E5484D)
  negative_25: '#460E17',
  negative_50: '#57141C',
  negative_100: '#6D1D24',
  negative_200: '#8B272E',
  negative_300: '#AD343A',
  negative_400: '#C93E43',
  negative_500: '#E5484D',
  negative_600: '#EB7074',
  negative_700: '#F19A9D',
  negative_800: '#F6BFC1',
  negative_900: '#FADADB',
  negative_950: '#FCEDED',
  negative_975: '#FEF6F6',
}

export const NORTHSKY_DIM_PALETTE: Palette = {
  ...STATIC,

  contrast_0: '#2B1548',
  contrast_25: '#352051',
  contrast_50: '#3F2B5A',
  contrast_100: '#4E3B66',
  contrast_200: '#64547A',
  contrast_300: '#796A8C',
  contrast_400: '#8D809E',
  contrast_500: '#A197B0',
  contrast_600: '#B4ABC0',
  contrast_700: '#C6BFD0',
  contrast_800: '#D6D1DE',
  contrast_900: '#E5E1EB',
  contrast_950: '#EDEAF2',
  contrast_975: '#F2EFF6',
  contrast_1000: '#F7F5FB',

  primary_25: '#2A2148',
  primary_50: '#2A2C4E',
  primary_100: '#2B4157',
  primary_200: '#2D5C63',
  primary_300: '#307D72',
  primary_400: '#3AAE8F',
  primary_500: '#4BE6B3',
  primary_600: '#71EBC2',
  primary_700: '#94F0D1',
  primary_800: '#B3F4DE',
  primary_900: '#D0F8EA',
  primary_950: '#E3FBF2',
  primary_975: '#F0FDF8',

  // upstream DEFAULT_SUBDUED_PALETTE positive ramp inverted (upstream's own dim values)
  ...pickPositive(invertPalette(DEFAULT_SUBDUED_PALETTE)),

  negative_25: '#4A1A22',
  negative_50: '#5A2029',
  negative_100: '#6F2830',
  negative_200: '#8C333A',
  negative_300: '#AC4249',
  negative_400: '#CA4E54',
  negative_500: '#E85B60',
  negative_600: '#ED7F83',
  negative_700: '#F2A2A5',
  negative_800: '#F7C4C6',
  negative_900: '#FADCDD',
  negative_950: '#FCECEC',
  negative_975: '#FEF6F6',
}
