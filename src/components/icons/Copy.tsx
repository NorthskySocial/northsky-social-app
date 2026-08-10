import {forwardRef} from 'react'
import Svg, {Path} from 'react-native-svg'

import {type Props, useCommonSVGProps} from '#/components/icons/common'

/*
 * northsky: brand icon, not part of the upstream icon library.
 *
 * Two stroked paths, which neither `createSinglePathSVG` (stroke, one path) nor
 * `createMultiPathSVG` (many paths, fill only) covers, so the paths are written
 * out here rather than widening the shared template.
 */
const PATHS = [
  'M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z',
  'M4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1',
]

export const Copy_Stroke2_Corner2_Rounded = forwardRef<Svg, Props>(
  function CopyIcon(props, ref) {
    const {fill, size, style, gradient, ...rest} = useCommonSVGProps(props)

    return (
      <Svg
        fill="none"
        {...rest}
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={[style]}>
        {gradient}
        {PATHS.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={fill}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    )
  },
)
