/**
 * Whether the picker should focus its search field as it opens.
 *
 * On a device whose main input is touch, focusing a text field raises the
 * on-screen keyboard, which shrinks the viewport and shoves the popover into
 * the corner of the screen, so the search stays unfocused until it is tapped.
 * With a mouse and keyboard it is a convenience: just start typing.
 */
export function shouldAutoFocusSearch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return !window.matchMedia('(pointer: coarse)').matches
}
