/**
 * Defaults to the `primary` gradient; pass a `gradient` key to use another
 * brand ramp. Style the interior via `style` (padding, min sizes, alignment).
 */
import {type ViewStyleProp} from '#/alf'
import {GradientRing} from '#/brand/GradientRing'
import {type gradients} from '#/brand/gradients'

export function GradientPill({
  children,
  style,
  gradient = 'primary',
}: React.PropsWithChildren<
  ViewStyleProp & {
    gradient?: keyof typeof gradients
  }
>) {
  return (
    <GradientRing gradient={gradient} style={style}>
      {children}
    </GradientRing>
  )
}
