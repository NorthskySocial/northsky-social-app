import {type ComponentProps, type JSX, useRef} from 'react'
import {
  type GestureResponderEvent,
  type Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import Animated from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'

import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {useHaptics} from '#/lib/haptics'
import {useMinimalShellFabTransform} from '#/lib/hooks/useMinimalShellTransform'
import {clamp} from '#/lib/numbers'
import {atoms as a, ios, tokens, useBreakpoints} from '#/alf'
import {GradientFill} from '#/components/GradientFill' // northsky: primary-CTA gradient
import {IS_WEB} from '#/env'

/**
 * Minimum time between the press-in and release haptics on iOS, so a quick tap
 * still plays two distinct taps.
 */
const MIN_HAPTIC_GAP_MS = 50

export interface FABProps extends ComponentProps<typeof Pressable> {
  testID?: string
  icon: JSX.Element
  style?: StyleProp<ViewStyle>
}

export function FABInner({testID, icon, onPress, style, ...props}: FABProps) {
  const insets = useSafeAreaInsets()
  const {gtMobile} = useBreakpoints()
  const haptics = useHaptics()
  const pressInHapticAt = useRef(0)
  const fabMinimalShellTransform = useMinimalShellFabTransform()

  const size = gtMobile ? styles.sizeLarge : styles.sizeRegular

  const tabletSpacing = gtMobile
    ? {right: 50, bottom: 50}
    : {right: 24, bottom: clamp(insets.bottom, 15, 60) + 15}

  return (
    <Animated.View
      style={[
        styles.outer,
        size,
        tabletSpacing,
        !gtMobile && fabMinimalShellTransform,
      ]}>
      <PressableScale
        testID={testID}
        onPressIn={ios(() => {
          pressInHapticAt.current = Date.now()
          haptics.tap()
        })}
        onPress={evt => {
          onPress?.(evt)
          const elapsed = Date.now() - pressInHapticAt.current
          if (elapsed < MIN_HAPTIC_GAP_MS) {
            setTimeout(haptics.tap, MIN_HAPTIC_GAP_MS - elapsed)
          } else {
            haptics.tap()
          }
        }}
        onLongPress={ios((evt: GestureResponderEvent) => {
          onPress?.(evt)
          haptics.longPress()
        })}
        targetScale={0.9}
        style={[
          a.rounded_full,
          size,
          // northsky: brand gradient fill instead of the flat primary_500; the
          // GradientFill sits behind the icon (zIndex -1), clipped to the circle.
          a.overflow_hidden,
          a.align_center,
          a.justify_center,
          style,
        ]}
        {...props}>
        <GradientFill
          gradient={tokens.gradients.primary}
          style={{zIndex: -1}}
        />
        {icon}
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  sizeRegular: {
    width: 56,
    height: 56,
    borderRadius: 30,
  },
  sizeLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  outer: {
    // @ts-expect-error web-only
    position: IS_WEB ? 'fixed' : 'absolute',
    zIndex: 1,
    cursor: 'pointer',
  },
})
