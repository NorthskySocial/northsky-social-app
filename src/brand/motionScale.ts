/*
 * Press and hover deformation for `SquishyPressable`, expressed as a pixel
 * distance rather than a scale ratio.
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
