/**
 * Northsky spring motion primitives.
 *
 * Ports the pronouns webapp's playful ".squish" interaction to React Native:
 * a subtle grow on hover and an anisotropic squash-and-stretch on press, each
 * springing back with a gentle overshoot. `SquishyPressable` is a drop-in
 * replacement for `Pressable` (it spreads all `PressableProps` through and
 * forwards its ref), so it can stand in wherever a plain pressable is used.
 *
 * Modeled on `#/lib/custom-animations/PressableScale` (same reanimated 3.19
 * `.get()`/`.set()` shared-value API, same `cancelAnimation` before each
 * transition, same `useReducedMotion` gate). The spring runs on the JS thread
 * on web, which is acceptable for these short, low-frequency interactions.
 */
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

/**
 * Spring tuned to approximate the pronouns overshoot easing
 * `cubic-bezier(0.34, 1.56, 0.64, 1)`. The low damping ratio supplies the
 * bounce; the fixed duration keeps hover/press/release feeling consistent.
 */
export const SQUISH_SPRING: WithSpringConfig = {
  duration: 300,
  dampingRatio: 0.6,
}

/**
 * The pronouns ".boing" select bounce, expressed as ordered `[scaleX, scaleY]`
 * stops over ~450ms (rest -> stretch -> settle -> rest). `SquishyPressable`
 * springs continuously and does not use this; it is exported as a shared
 * constant so future opt-in select/confirm moments can drive it through a
 * reanimated `Keyframe` or a `withSequence(withTiming(...))` chain without
 * re-deriving the numbers.
 */
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

// Target scales for each interaction state, mirroring the pronouns CSS:
// press squashes (wider + shorter), hover grows uniformly, rest is identity.
const PRESS_SCALE_X = 1.1
const PRESS_SCALE_Y = 0.9
const HOVER_SCALE = 1.06
const REST_SCALE = 1

/**
 * A `Pressable` that squishes on press and grows on hover with a springy
 * overshoot. Accepts and forwards every `PressableProps` (style arrays, `role`,
 * `testID`, a11y props, refs, ...); only the four interaction handlers are
 * wrapped, and any caller-supplied handler still runs. Motion is skipped
 * entirely under reduced-motion (native setting or web `prefers-reduced-motion`).
 */
// northsky: `squish` gates the animation without changing which component
// type renders, so toggling a Button's color/variant can't remount its
// subtree. When false, behaves like a plain Pressable.
export type SquishyPressableProps = PressableProps & {squish?: boolean}

export const SquishyPressable = forwardRef<View, SquishyPressableProps>(
  function SquishyPressable(
    {
      children,
      style,
      squish = true,
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

    // Track combined hover+press so releasing a press while the pointer is
    // still hovering (web) springs back to the hover scale rather than to
    // rest -- mirroring the CSS `.squish`, where `:hover` outlives `:active`.
    // On native `onHoverIn/onHoverOut` never fire, so `hovered` stays false
    // and behavior is unchanged (press -> rest).
    const hovered = useRef(false)
    const pressed = useRef(false)

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{scaleX: sx.get()}, {scaleY: sy.get()}],
    }))

    const enabled = squish && !reducedMotion

    const springTo = (x: number, y: number) => {
      // northsky: when disabled (squish off, or reduced motion) the animated
      // transform is dropped from the style array below, so scheduling springs
      // here would only step them on the UI thread for output that is never
      // rendered -- skip entirely.
      if (!enabled) return
      cancelAnimation(sx)
      cancelAnimation(sy)
      sx.set(() => withSpring(x, SQUISH_SPRING))
      sy.set(() => withSpring(y, SQUISH_SPRING))
    }

    const settle = () => {
      if (pressed.current) {
        springTo(PRESS_SCALE_X, PRESS_SCALE_Y)
      } else if (hovered.current) {
        springTo(HOVER_SCALE, HOVER_SCALE)
      } else {
        springTo(REST_SCALE, REST_SCALE)
      }
    }

    return (
      <AnimatedPressable
        // @ts-ignore - the underlying component is always a Pressable
        ref={ref}
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
