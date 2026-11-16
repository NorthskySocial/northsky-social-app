import type * as RN from 'react-native'
import {render, screen} from '@testing-library/react-native'

import {contrastRatio} from '#/alf/util/colorGeneration'
import {
  brandBorderWeb,
  CALM_ACCENT,
  CALM_ACCENT_HOVER,
  CALM_RING_WIDTH,
  navHoverWash,
} from '#/brand/accents'
import {GradientRing} from '#/brand/GradientRing'
import {NAV_WASH_TINT, PRIMARY_GRADIENT_CSS} from '#/brand/gradients'
import {type Accents} from '#/features/northskyAppearance'

/* `web()` is a no-op under the iOS jest preset; let the web styles through. */
jest.mock('#/alf/util/platform', () => ({
  web: (style: unknown) => style,
}))

/*
 * ALF's barrel reaches modules a unit test cannot boot (see
 * src/components/RichTextCode.test.tsx). GradientRing only needs these.
 */
jest.mock('#/alf', () => ({
  tokens: {borderRadius: {full: 999}},
  useTheme: () => ({
    atoms: {
      bg: {backgroundColor: '#ffffff'},
      border_contrast_low: {borderColor: '#e1dff0'},
    },
  }),
}))

jest.mock('expo-linear-gradient', () => {
  const {View} = jest.requireActual<typeof RN>('react-native')
  return {
    LinearGradient: (props: React.ComponentProps<typeof View>) => (
      <View testID="brandRingGradient" {...props} />
    ),
  }
})

let mockAccents: Accents = 'lively'
jest.mock('#/features/northskyAppearance', () => ({
  useAccents: () => mockAccents,
}))

beforeEach(() => {
  mockAccents = 'lively'
})

describe('calm accent colours', () => {
  /* Calm drops the text-shadow scrim, so white labels must pass AA alone. */
  it('keep white button labels at AA contrast', () => {
    expect(contrastRatio(CALM_ACCENT, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(CALM_ACCENT_HOVER, '#ffffff')).toBeGreaterThanOrEqual(
      4.5,
    )
  })
})

describe('brandBorderWeb', () => {
  const opts = {bgColor: '#ffffff', ringColor: '#e1dff0'}

  it('paints the gradient ring when lively', () => {
    const style = brandBorderWeb('lively', opts) as {background: string}
    expect(style.background).toContain(PRIMARY_GRADIENT_CSS)
  })

  it('paints a solid hairline over the fill when calm', () => {
    expect(brandBorderWeb('calm', opts)).toEqual({
      backgroundColor: '#ffffff',
      borderWidth: CALM_RING_WIDTH,
      borderColor: '#e1dff0',
      borderStyle: 'solid',
    })
  })
})

describe('navHoverWash', () => {
  it('keeps the gradient wash when lively', () => {
    expect(navHoverWash('lively')).toHaveProperty('backgroundImage')
  })

  it('is a flat tint when calm', () => {
    expect(navHoverWash('calm')).toEqual({backgroundColor: NAV_WASH_TINT})
  })
})

describe('GradientRing', () => {
  it('renders the gradient when lively', () => {
    render(<GradientRing />)
    expect(screen.getByTestId('brandRingGradient')).toBeTruthy()
    expect(screen.queryByTestId('brandRingCalm')).toBeNull()
  })

  it('renders a hairline border when calm', () => {
    mockAccents = 'calm'
    render(<GradientRing radius={16} />)
    expect(screen.queryByTestId('brandRingGradient')).toBeNull()
    expect(screen.getByTestId('brandRingCalm')).toHaveStyle({
      borderRadius: 16,
      borderWidth: CALM_RING_WIDTH,
      borderColor: '#e1dff0',
    })
  })
})
