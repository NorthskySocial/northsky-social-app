/**
 * Defaults to the `primary` gradient. Style the interior via `style`
 * (padding, min sizes, background override, alignment). Under the calm
 * accents setting the ring is a solid hairline instead of a gradient.
 */
import {View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

import {tokens, useTheme, type ViewStyleProp} from '#/alf'
import {CALM_RING_WIDTH, useIsLively} from '#/brand/accents'
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
    /** Outer corner radius. Interior corner is inset by the ring width. */
    radius?: number
    /** Gradient ring thickness in px. Calm rings are always a hairline. */
    width?: number
  }
>) {
  const t = useTheme()
  const lively = useIsLively()

  if (!lively) {
    return (
      <View
        testID="brandRingCalm"
        style={[
          {borderRadius: radius, borderWidth: CALM_RING_WIDTH},
          t.atoms.border_contrast_low,
        ]}>
        <View
          style={[
            {borderRadius: Math.max(radius - CALM_RING_WIDTH, 0)},
            t.atoms.bg,
            style,
          ]}>
          {children}
        </View>
      </View>
    )
  }

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
