/**
 * Northsky signature gradient-ring pill.
 *
 * A stadium capsule that frames its content with the brand magenta->mint
 * gradient: the `LinearGradient` paints a 2px ring and the inner `View` sits on
 * the theme background, so only the ring shows the gradient. It defaults to the
 * `primary` gradient; pass a `gradient` key to use another brand ramp. Callers
 * style the interior via `style` (padding, min sizes, alignment).
 *
 * `expo-linear-gradient` takes `colors` and `locations` as separate props, so
 * the gradient's `[position, hex]` tuples are split into two arrays here -
 * derived from the same ramp so colors and stops stay paired by construction
 * (mirrors `components/GradientFill.tsx`). Standalone brand primitive -
 * intentionally not wired into any call site yet.
 */
import {type ColorValue, View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

import {atoms as a, useTheme, type ViewStyleProp} from '#/alf'
import {gradients} from '#/brand/gradients'

export function GradientPill({
  children,
  style,
  gradient = 'primary',
}: React.PropsWithChildren<
  ViewStyleProp & {
    gradient?: keyof typeof gradients
  }
>) {
  const t = useTheme()
  const values = gradients[gradient].values
  const colors = values.map(([, color]) => color) as [
    ColorValue,
    ColorValue,
    ...ColorValue[],
  ]
  const locations = values.map(([location]) => location) as [
    number,
    number,
    ...number[],
  ]
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[a.rounded_full, a.p_2xs]}>
      <View style={[a.rounded_full, t.atoms.bg, style]}>{children}</View>
    </LinearGradient>
  )
}
