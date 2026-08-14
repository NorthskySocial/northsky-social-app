import {forwardRef} from 'react'
import Svg, {G, Path} from 'react-native-svg'

import {type Props, useCommonSVGProps} from '#/components/icons/common'
import {type IconWithSvgMeta} from '#/components/icons/TEMPLATE'

/**
 * Tabler draws at a stroke width of 2. That reads heavy at 16px, which is the
 * size most of the app's icons render at, so the fork draws at 1.75.
 */
export const DEFAULT_STROKE_WIDTH = 1.75

/**
 * Stroke width for icons in the feed's post controls.
 *
 * Those render at 18px, the smallest size in the app. The default weight reads
 * thin there, so the feed asks for Tabler's own weight of 2 instead.
 */
export const FEED_ICON_STROKE_WIDTH = 2

/**
 * Builds the rotation transform for an icon, about the centre of its view box.
 *
 * Tabler ships one glyph where the app has a mirrored pair. The clearest case is
 * the quote marks: upstream draws the opening mark as the closing mark turned
 * through 180 degrees, and Tabler only has the closing form.
 */
function rotationTransform(viewBox: string, rotate: number | undefined) {
  if (!rotate) return undefined

  const [minX, minY, width, height] = viewBox.split(/\s+/).map(Number)
  const centreX = minX + width / 2
  const centreY = minY + height / 2

  return `rotate(${rotate} ${centreX} ${centreY})`
}

/**
 * Builds a stroke-based, multi-path icon component from a Tabler outline icon.
 *
 * The upstream helpers in `#/components/icons/TEMPLATE` cannot render one.
 * `createSinglePathSVG` supports a stroke but accepts only one path.
 * `createMultiPathSVG` accepts many paths but always fills them. A typical
 * Tabler outline icon needs both: 2 or more paths, each stroked.
 *
 * These helpers live in `src/features/` so that the fork adds no merge surface
 * to the upstream TEMPLATE file.
 *
 * The component keeps the same props and the same `svgPaths` / `svgViewBox` /
 * `svgStrokeWidth` metadata as the upstream helpers. A Tabler icon is therefore
 * a drop-in replacement for an upstream icon at every call site.
 */
export function createTablerIcon({
  paths,
  viewBox = '0 0 24 24',
  strokeWidth = DEFAULT_STROKE_WIDTH,
  rotate,
}: {
  paths: string[]
  viewBox?: string
  strokeWidth?: number
  rotate?: number
}) {
  const transform = rotationTransform(viewBox, rotate)

  const Icon = forwardRef<Svg, Props>(function TablerIconImpl(props, ref) {
    const {
      fill,
      size,
      style,
      gradient,
      strokeWidth: strokeWidthOverride,
      ...rest
    } = useCommonSVGProps(props)

    /* A call site can ask for a heavier stroke. Small sizes need it: the same
     * width that reads well at 24px looks thin at the 18px the feed uses. */
    const width =
      strokeWidthOverride === undefined
        ? strokeWidth
        : Number(strokeWidthOverride)

    return (
      <Svg
        fill="none"
        {...rest}
        ref={ref}
        viewBox={viewBox}
        width={size}
        height={size}
        style={[style]}>
        {gradient}
        <G transform={transform}>
          {paths.map((path, i) => (
            <Path
              key={i}
              d={path}
              fill="none"
              /* `useCommonSVGProps` resolves the icon color into `fill`. A
               * stroke icon must apply that color to the stroke instead. */
              stroke={fill}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </G>
      </Svg>
    )
  }) as IconWithSvgMeta

  Icon.svgPaths = paths
  Icon.svgViewBox = viewBox
  Icon.svgStrokeWidth = strokeWidth

  return Icon
}

/**
 * Builds a fill-based, multi-path icon component from a Tabler filled icon.
 *
 * The upstream `createMultiPathSVG` is close, but it forces `fillRule="evenodd"`.
 * Tabler filled icons declare no fill rule, so they assume the SVG default of
 * `nonzero`. Under `evenodd` an overlapping subpath turns into a hole, so this
 * helper leaves the fill rule at the default instead.
 */
export function createTablerFilledIcon({
  paths,
  viewBox = '0 0 24 24',
  rotate,
}: {
  paths: string[]
  viewBox?: string
  rotate?: number
}) {
  const transform = rotationTransform(viewBox, rotate)

  const Icon = forwardRef<Svg, Props>(
    function TablerFilledIconImpl(props, ref) {
      const {fill, size, style, gradient, ...rest} = useCommonSVGProps(props)

      return (
        <Svg
          fill="none"
          {...rest}
          ref={ref}
          viewBox={viewBox}
          width={size}
          height={size}
          style={[style]}>
          {gradient}
          <G transform={transform}>
            {paths.map((path, i) => (
              <Path key={i} d={path} fill={fill} />
            ))}
          </G>
        </Svg>
      )
    },
  ) as IconWithSvgMeta

  Icon.svgPaths = paths
  Icon.svgViewBox = viewBox
  Icon.svgStrokeWidth = 0

  return Icon
}
