import {LinearGradient} from 'expo-linear-gradient'

import {atoms as a, type tokens, type ViewStyleProp} from '#/alf'
import {splitGradientStops} from '#/brand/gradients' // northsky: shared gradient stop split

export function GradientFill({
  gradient,
  style,
}: ViewStyleProp & {
  gradient:
    | typeof tokens.gradients.primary
    | typeof tokens.gradients.sky
    | typeof tokens.gradients.midnight
    | typeof tokens.gradients.sunrise
    | typeof tokens.gradients.sunset
    | typeof tokens.gradients.bonfire
    | typeof tokens.gradients.summer
    | typeof tokens.gradients.nordic
}) {
  if (gradient.values.length < 2) {
    throw new Error('Gradient must have at least 2 colors')
  }

  // northsky: single-sourced stop split (see brand/gradients.ts)
  const {colors, locations} = splitGradientStops(gradient.values)

  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[a.absolute, a.inset_0, style]}
    />
  )
}
