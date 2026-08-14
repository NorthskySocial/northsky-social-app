/*
 * Press and hover deformation for the whole app, expressed as a pixel distance
 * rather than a scale ratio. Used by `SquishyPressable`, `PressableScale`, the
 * `useMeasuredScale` hook, and the image press styles.
 *
 * A ratio moves each edge by a fraction of the element, so one value cannot fit
 * every button: the 1.1 scaleX that nudged a small pill by 4px threw a
 * full-width "Accept" CTA about 40px past both screen edges. A pixel distance
 * moves every edge the same amount at every button size.
 *
 * This module holds no Reanimated import so the maths stays unit-testable.
 */

export const PRESS_GROW_PX = 3
export const PRESS_SQUASH_PX = 3
export const HOVER_GROW_PX = 2
// For elements that shrink on both axes on press, such as images.
export const PRESS_SHRINK_PX = 3
export const REST_SCALE = 1

// Very small elements would still deform a lot per pixel, so cap the ratio.
const MAX_SCALE_DELTA = 0.1

/**
 * Returns the scale factor that changes the size of an element by `deltaPx`.
 * The element scales about its centre, so each edge moves half of `deltaPx`.
 * A negative `deltaPx` shrinks the element. Returns the rest scale before
 * layout reports a size, which disables the motion instead of guessing at it.
 */
export function scaleForDelta(size: number, deltaPx: number): number {
  if (!(size > 0)) return REST_SCALE
  const ratio = (size + deltaPx) / size
  return Math.min(
    Math.max(ratio, REST_SCALE - MAX_SCALE_DELTA),
    REST_SCALE + MAX_SCALE_DELTA,
  )
}

/**
 * Returns the scale an element takes while it is pressed.
 *
 * A caller that names `targetScale` gets it, because it sets the size of its
 * own element and knows what the ratio does to it. A caller that names none is
 * measured and shrunk by a set distance, which a ratio cannot do at every
 * size. Returns the rest scale where a press does not scale, such as under a
 * mouse on the web.
 *
 * The scale comes off the longest edge, and is the same on both axes. Equal
 * pixel travel on each axis needs a different scale per axis, which turns a
 * round avatar into an oval and a pill corner into an ellipse. Scaling by the
 * longest edge keeps the shape and still caps how far any edge travels.
 */
export function pressScale({
  targetScale,
  width,
  height,
  enabled,
}: {
  targetScale?: number
  width: number
  height: number
  enabled: boolean
}): number {
  if (targetScale !== undefined) return targetScale
  if (!enabled) return REST_SCALE
  return scaleForDelta(Math.max(width, height), -PRESS_SHRINK_PX)
}
