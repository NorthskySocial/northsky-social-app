import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

// northsky: size-independent press feedback
import {pressScale, REST_SCALE} from '#/brand/motionScale'
import {IS_NATIVE, IS_WEB_TOUCH_DEVICE} from '#/env'

// northsky: a mouse gets no press feedback, only touch does.
const PRESSES_SCALE = IS_NATIVE || IS_WEB_TOUCH_DEVICE

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function PressableScale({
  targetScale,
  children,
  style,
  onLayout,
  onPressIn,
  onPressOut,
  ...rest
}: {
  targetScale?: number
  style?: StyleProp<ViewStyle>
} & Exclude<PressableProps, 'onPressIn' | 'onPressOut' | 'style'>) {
  const reducedMotion = useReducedMotion()

  const scale = useSharedValue(REST_SCALE)

  /* northsky: measured size, held in shared values so onLayout never causes a
   * render. This component backs bottom-bar tabs and list rows, where a render
   * per layout would be costly. A caller that names a targetScale is never
   * measured, so it keeps the layout cost it had before. */
  const width = useSharedValue(0)
  const height = useSharedValue(0)
  const measures = targetScale === undefined && PRESSES_SCALE

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.get()}],
  }))

  const scaleTo = (to: number) => {
    cancelAnimation(scale)
    scale.set(() => withTiming(to, {duration: 100}))
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onLayout={
        measures
          ? e => {
              onLayout?.(e)
              width.set(e.nativeEvent.layout.width)
              height.set(e.nativeEvent.layout.height)
            }
          : onLayout
      }
      onPressIn={e => {
        if (onPressIn) {
          onPressIn(e)
        }
        // northsky: see pressScale for how the two kinds of caller differ
        scaleTo(
          pressScale({
            targetScale,
            width: width.get(),
            height: height.get(),
            enabled: PRESSES_SCALE,
          }),
        )
      }}
      onPressOut={e => {
        if (onPressOut) {
          onPressOut(e)
        }
        scaleTo(REST_SCALE)
      }}
      style={[!reducedMotion && animatedStyle, style]}
      {...rest}>
      {children}
    </AnimatedPressable>
  )
}
