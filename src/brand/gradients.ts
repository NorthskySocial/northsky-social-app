/**
 * Same shape/keys as upstream's `gradients` (`@bsky.app/alf` /
 * `src/alf/tokens.ts`) so consumers need no changes. `primary` is the
 * signature magenta->mint; the rest are brand-tinted variants. `as const`
 * preserves the narrow tuple types consumers cast against.
 */
import {type ColorValue} from 'react-native'
import {utils} from '@bsky.app/alf'

import {web} from '#/alf/util/platform'
import {NORTHSKY_LIGHT_PALETTE} from '#/brand/palette'

export const gradients = {
  primary: {
    values: [
      [0, '#BB0FFB'],
      [0.35, '#9F3DEF'],
      [0.65, '#718ADA'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#8A5FE5',
  },
  sky: {
    values: [
      [0, '#7780DC'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#53BCCC',
  },
  midnight: {
    values: [
      [0, '#1F0B35'],
      [1, '#7780DC'],
    ],
    hover_value: '#2B1548',
  },
  sunrise: {
    values: [
      [0, '#53BCCC'],
      [0.4, '#718ADA'],
      [0.8, '#9F3DEF'],
      [1, '#C400FF'],
    ],
    hover_value: '#718ADA',
  },
  sunset: {
    values: [
      [0, '#3E1960'],
      [0.6, '#8A5FE5'],
      [1, '#C400FF'],
    ],
    hover_value: '#8A5FE5',
  },
  summer: {
    values: [
      [0, '#9A45EC'],
      [0.3, '#BB0FFB'],
      [1, '#EC4899'],
    ],
    hover_value: '#BB0FFB',
  },
  nordic: {
    values: [
      [0, '#1F0B35'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#258578',
  },
  bonfire: {
    values: [
      [0, '#2B1548'],
      [0.4, '#6B2FA4'],
      [0.8, '#B272F1'],
      [1, '#DFC3F9'],
    ],
    hover_value: '#6B2FA4',
  },
} as const

/** expo-linear-gradient wants `colors`/`locations` as separate parallel arrays. */
export function splitGradientStops(
  values: readonly (readonly [number, string])[],
): {
  colors: [ColorValue, ColorValue, ...ColorValue[]]
  locations: [number, number, ...number[]]
} {
  return {
    colors: values.map(([, color]) => color) as [
      ColorValue,
      ColorValue,
      ...ColorValue[],
    ],
    locations: values.map(([location]) => location) as [
      number,
      number,
      ...number[],
    ],
  }
}

export const PRIMARY_GRADIENT_CSS = `linear-gradient(135deg, ${gradients.primary.values
  .map(([pos, hex]) => `${hex} ${Math.round(pos * 100)}%`)
  .join(', ')})`

/** `background` shorthand is required: `padding-box`/`border-box` are invalid in `background-image`. */
export function gradientBorderWeb(bgColor: string, width = 2) {
  return web({
    background: `linear-gradient(${bgColor}, ${bgColor}) padding-box, ${PRIMARY_GRADIENT_CSS} border-box`,
    borderWidth: width,
    borderColor: 'transparent',
    borderStyle: 'solid',
  })
}

const navWashStops = gradients.primary.values
export const navItemHoverWash = {
  backgroundColor: utils.alpha(NORTHSKY_LIGHT_PALETTE.primary_500, 0.1),
  ...web({
    backgroundImage: `linear-gradient(135deg, ${utils.alpha(
      navWashStops[0][1],
      0.12,
    )}, ${utils.alpha(navWashStops[navWashStops.length - 1][1], 0.12)})`,
  }),
}
