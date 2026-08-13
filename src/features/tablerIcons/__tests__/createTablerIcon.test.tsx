import Svg, {G, Path} from 'react-native-svg'
import {render} from '@testing-library/react-native'

import {
  Check_Stroke2_Corner0_Rounded,
  CheckThick_Stroke2_Corner0_Rounded,
} from '#/components/icons/Check'
import {
  Earth_Stroke2_Corner0_Rounded,
  Globe_Stroke2_Corner0_Rounded,
} from '#/components/icons/Globe'
import {
  Image_Stroke1_Corner0_Rounded,
  Image_Stroke2_Corner0_Rounded,
} from '#/components/icons/Image'
import {
  CloseQuote_Stroke2_Corner0_Rounded,
  OpenQuote_Stroke2_Corner0_Rounded,
} from '#/components/icons/Quote'
import {
  createTablerFilledIcon,
  createTablerIcon,
  DEFAULT_STROKE_WIDTH,
  FEED_ICON_STROKE_WIDTH,
} from '../createTablerIcon'
import mapping from '../mapping.json'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot, so it is stubbed down to the two things `useCommonSVGProps`
 * reads: the theme palette and the gradient tokens.
 */
jest.mock('#/alf', () => ({
  tokens: {gradients: {}},
  useTheme: () => ({palette: {primary_500: '#0000ff'}}),
}))

const PATHS = ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6']

function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

describe('createTablerIcon', () => {
  it('exposes the same svg metadata as the upstream icon helpers', () => {
    const Icon = createTablerIcon({paths: PATHS})

    expect(Icon.svgPaths).toEqual(PATHS)
    expect(Icon.svgViewBox).toBe('0 0 24 24')
    expect(Icon.svgStrokeWidth).toBe(DEFAULT_STROKE_WIDTH)
  })

  it('renders one path per entry', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon />)

    const paths = tree.UNSAFE_getAllByType(Path)
    expect(paths).toHaveLength(2)
    expect(paths.map(p => propsOf(p).d)).toEqual(PATHS)
  })

  it('strokes each path instead of filling it', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      const props = propsOf(path)
      expect(props.fill).toBe('none')
      expect(props.strokeWidth).toBe(DEFAULT_STROKE_WIDTH)
      expect(props.strokeLinecap).toBe('round')
      expect(props.strokeLinejoin).toBe('round')
    }
  })

  it('applies the resolved icon color to the stroke, not the fill', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon fill="#ff0000" />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).stroke).toBe('#ff0000')
    }
  })

  it('falls back to the theme color when no fill is given', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).stroke).toBe('#0000ff')
    }
  })

  it('maps the size token onto the svg dimensions', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon size="2xl" />)

    const svg = propsOf(tree.UNSAFE_getAllByType(Svg)[0])
    expect(svg.width).toBe(32)
    expect(svg.height).toBe(32)
  })

  it('honours a custom stroke width and view box', () => {
    const Icon = createTablerIcon({
      paths: PATHS,
      strokeWidth: 1.5,
      viewBox: '0 0 32 32',
    })
    const tree = render(<Icon />)

    expect(Icon.svgStrokeWidth).toBe(1.5)
    expect(propsOf(tree.UNSAFE_getAllByType(Svg)[0]).viewBox).toBe('0 0 32 32')
    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).strokeWidth).toBe(1.5)
    }
  })
})

describe('stroke width override', () => {
  it('lets a call site ask for a heavier stroke', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon strokeWidth={FEED_ICON_STROKE_WIDTH} />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).strokeWidth).toBe(FEED_ICON_STROKE_WIDTH)
    }
  })

  it('overrides a width the icon baked in', () => {
    const Icon = createTablerIcon({paths: PATHS, strokeWidth: 1.25})
    const tree = render(<Icon strokeWidth={3} />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).strokeWidth).toBe(3)
    }
  })

  it('is heavier than the default, or the feed gains nothing', () => {
    expect(FEED_ICON_STROKE_WIDTH).toBeGreaterThan(DEFAULT_STROKE_WIDTH)
  })
})

describe('createTablerFilledIcon', () => {
  const FILLED = ['M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0 -20z', 'M9 9h6v6h-6z']

  it('fills each path and never strokes it', () => {
    const Icon = createTablerFilledIcon({paths: FILLED})
    const tree = render(<Icon fill="#00ff00" />)

    const paths = tree.UNSAFE_getAllByType(Path)
    expect(paths).toHaveLength(2)
    for (const path of paths) {
      expect(propsOf(path).fill).toBe('#00ff00')
      expect(propsOf(path).stroke).toBeUndefined()
      expect(propsOf(path).strokeWidth).toBeUndefined()
    }
  })

  it('leaves the fill rule at the SVG default', () => {
    /* Tabler filled icons declare no fill rule, so they assume nonzero. Forcing
     * evenodd turns an overlapping subpath into a hole. */
    const Icon = createTablerFilledIcon({paths: FILLED})
    const tree = render(<Icon />)

    for (const path of tree.UNSAFE_getAllByType(Path)) {
      expect(propsOf(path).fillRule).toBeUndefined()
    }
  })

  it('reports a zero stroke width in its metadata', () => {
    const Icon = createTablerFilledIcon({paths: FILLED})

    expect(Icon.svgStrokeWidth).toBe(0)
    expect(Icon.svgPaths).toEqual(FILLED)
  })
})

describe('rotation', () => {
  it('turns the glyph about the centre of the view box', () => {
    const Icon = createTablerIcon({paths: PATHS, rotate: 180})
    const tree = render(<Icon />)

    expect(propsOf(tree.UNSAFE_getAllByType(G)[0]).transform).toBe(
      'rotate(180 12 12)',
    )
  })

  it('uses the centre of a non-default view box', () => {
    const Icon = createTablerIcon({
      paths: PATHS,
      viewBox: '0 0 64 64',
      rotate: 90,
    })
    const tree = render(<Icon />)

    expect(propsOf(tree.UNSAFE_getAllByType(G)[0]).transform).toBe(
      'rotate(90 32 32)',
    )
  })

  it('applies no transform when no rotation is asked for', () => {
    const Icon = createTablerIcon({paths: PATHS})
    const tree = render(<Icon />)

    expect(propsOf(tree.UNSAFE_getAllByType(G)[0]).transform).toBeUndefined()
  })

  it('rotates filled icons too', () => {
    const Icon = createTablerFilledIcon({paths: PATHS, rotate: 180})
    const tree = render(<Icon />)

    expect(propsOf(tree.UNSAFE_getAllByType(G)[0]).transform).toBe(
      'rotate(180 12 12)',
    )
  })

  it('turns the opening quote away from the closing quote', () => {
    /* Tabler ships only the closing form, so the pair must differ by rotation
     * or the marks would point the same way. */
    expect(OpenQuote_Stroke2_Corner0_Rounded.svgPaths).toEqual(
      CloseQuote_Stroke2_Corner0_Rounded.svgPaths,
    )

    const open = render(<OpenQuote_Stroke2_Corner0_Rounded />)
    const close = render(<CloseQuote_Stroke2_Corner0_Rounded />)

    expect(propsOf(open.UNSAFE_getAllByType(G)[0]).transform).toBe(
      'rotate(180 12 12)',
    )
    expect(propsOf(close.UNSAFE_getAllByType(G)[0]).transform).toBeUndefined()
  })
})

describe('icon mapping', () => {
  const entries = Object.entries(mapping) as [
    string,
    Record<string, {tabler: string; strokeWidth?: number}>,
  ][]

  it('covers every listed module with at least one export', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const [, exports] of entries) {
      expect(Object.keys(exports).length).toBeGreaterThan(0)
    }
  })

  it('names a Tabler icon for every export', () => {
    for (const [file, exports] of entries) {
      for (const [name, spec] of Object.entries(exports)) {
        expect(`${file}:${name}:${spec.tabler}`).toMatch(
          /^[\w.]+:\w+:[a-z0-9-]+$/,
        )
      }
    }
  })

  it('does not name the same export in two modules', () => {
    const names = entries.flatMap(([, exports]) => Object.keys(exports))
    expect(new Set(names).size).toBe(names.length)
  })
})

/*
 * The generator is the enforcement point: it refuses to rewrite a module unless
 * the mapping covers every export that module has. These cases spot-check the
 * committed output for the mappings that carry a deliberate weight or a glyph
 * choice, which are the ones a careless regeneration would flatten.
 */
describe('generated icon modules', () => {
  it('draws the standard weight at the fork default', () => {
    expect(Check_Stroke2_Corner0_Rounded.svgStrokeWidth).toBe(
      DEFAULT_STROKE_WIDTH,
    )
  })

  it('keeps CheckThick heavier than Check', () => {
    expect(CheckThick_Stroke2_Corner0_Rounded.svgStrokeWidth).toBeGreaterThan(
      Check_Stroke2_Corner0_Rounded.svgStrokeWidth,
    )
    expect(CheckThick_Stroke2_Corner0_Rounded.svgPaths).toEqual(
      Check_Stroke2_Corner0_Rounded.svgPaths,
    )
  })

  it('keeps the Stroke1 variant lighter than the Stroke2 variant', () => {
    expect(Image_Stroke1_Corner0_Rounded.svgStrokeWidth).toBeLessThan(
      Image_Stroke2_Corner0_Rounded.svgStrokeWidth,
    )
  })

  it('gives Globe and Earth different glyphs', () => {
    expect(Globe_Stroke2_Corner0_Rounded.svgPaths).not.toEqual(
      Earth_Stroke2_Corner0_Rounded.svgPaths,
    )
  })
})
