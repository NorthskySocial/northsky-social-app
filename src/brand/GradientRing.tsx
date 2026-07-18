/**
 * Defaults to the `primary` gradient. Style the interior via `style`
 * (padding, min sizes, background override, alignment).
 */
import {View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

import {tokens, useTheme, type ViewStyleProp} from '#/alf'
import {gradients, splitGradientStops} from '#/brand/gradients'

export function GradientRing({
  children,
  style,
  gradient = 'primary',
  radius = tokens.borderRadius.full,
  width = 2,
}: React.PropsWithChildren<
  ViewStyleProp & {
    gradient?: keyof typeof gradients
    /** Outer corner radius. Interior corner is inset by `width`. */
    radius?: number
    /** Ring thickness in px. */
    width?: number
  }
>) {
  const t = useTheme()
  const {colors, locations} = splitGradientStops(gradients[gradient].values)
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={{borderRadius: radius, padding: width}}>
      <View
        style={[
          {borderRadius: Math.max(radius - width, 0)},
          t.atoms.bg,
          style,
        ]}>
        {children}
      </View>
    </LinearGradient>
  )
}
