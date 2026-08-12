import {forwardRef, useRef} from 'react'
import {Pressable, type PressableProps, type View} from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated'

import {
  HOVER_GROW_PX,
  PRESS_GROW_PX,
  PRESS_SQUASH_PX,
  REST_SCALE,
  scaleForDelta,
} from './motionScale'

export const SQUISH_SPRING: WithSpringConfig = {
  duration: 300,
  dampingRatio: 0.6,
}

export const BOING = {
  durationMs: 450,
  stops: [
    {at: 0, scaleX: 1, scaleY: 1},
    {at: 0.35, scaleX: 1.15, scaleY: 0.85},
    {at: 0.7, scaleX: 0.95, scaleY: 1.05},
    {at: 1, scaleX: 1, scaleY: 1},
  ],
} as const

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * A `Pressable` that squishes on press and grows on hover with a springy
 * overshoot. Forwards all `PressableProps`; skips motion under reduced-motion.
 * `squish` gates the animation without swapping component type, so toggling
 * it (e.g. via a Button prop) can't remount the subtree.
 */
export type SquishyPressableProps = PressableProps & {squish?: boolean}

export const SquishyPressable = forwardRef<View, SquishyPressableProps>(
  function SquishyPressable(
    {
      children,
      style,
      squish = true,
      onLayout,
      onPressIn,
      onPressOut,
      onHoverIn,
      onHoverOut,
      ...rest
    },
    ref,
  ) {
    const reducedMotion = useReducedMotion()

    const sx = useSharedValue(REST_SCALE)
    const sy = useSharedValue(REST_SCALE)

    // Measured size, held in shared values so onLayout never re-renders the
    // button. High-cardinality lists (Follow buttons) depend on that.
    const width = useSharedValue(0)
    const height = useSharedValue(0)

    const hovered = useRef(false)
    const pressed = useRef(false)

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{scaleX: sx.get()}, {scaleY: sy.get()}],
    }))

    const enabled = squish && !reducedMotion

    const springTo = (x: number, y: number) => {
      // Disabled means the style array below drops the transform, so don't bother scheduling it.
      if (!enabled) return
      cancelAnimation(sx)
      cancelAnimation(sy)
      sx.set(() => withSpring(x, SQUISH_SPRING))
      sy.set(() => withSpring(y, SQUISH_SPRING))
    }

    const settle = () => {
      if (pressed.current) {
        springTo(
          scaleForDelta(width.get(), PRESS_GROW_PX),
          scaleForDelta(height.get(), -PRESS_SQUASH_PX),
        )
      } else if (hovered.current) {
        springTo(
          scaleForDelta(width.get(), HOVER_GROW_PX),
          scaleForDelta(height.get(), HOVER_GROW_PX),
        )
      } else {
        springTo(REST_SCALE, REST_SCALE)
      }
    }

    return (
      <AnimatedPressable
        // @ts-ignore - the underlying component is always a Pressable
        ref={ref}
        onLayout={e => {
          onLayout?.(e)
          width.set(e.nativeEvent.layout.width)
          height.set(e.nativeEvent.layout.height)
        }}
        onPressIn={e => {
          onPressIn?.(e)
          pressed.current = true
          settle()
        }}
        onPressOut={e => {
          onPressOut?.(e)
          pressed.current = false
          settle()
        }}
        onHoverIn={e => {
          onHoverIn?.(e)
          hovered.current = true
          settle()
        }}
        onHoverOut={e => {
          onHoverOut?.(e)
          hovered.current = false
          settle()
        }}
        style={
          typeof style === 'function'
            ? state => [enabled && animatedStyle, style(state)]
            : [enabled && animatedStyle, style]
        }
        {...rest}>
        {children}
      </AnimatedPressable>
    )
  },
)
