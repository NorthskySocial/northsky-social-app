import Svg, {Path} from 'react-native-svg'
import {render} from '@testing-library/react-native'

import {
  PersonPlus_Filled_Corner2_Rounded,
  PersonPlus_Filled_Stroke2_Corner0_Rounded,
  PersonPlus_Stroke2_Corner0_Rounded,
  PersonPlus_Stroke2_Corner2_Rounded,
} from '#/components/icons/Person'

jest.mock('#/alf', () => ({
  tokens: {gradients: {}},
  useTheme: () => ({palette: {primary_500: '#0000ff'}}),
}))

it.each([
  PersonPlus_Filled_Corner2_Rounded,
  PersonPlus_Filled_Stroke2_Corner0_Rounded,
])('renders both filled person-plus exports with solid paths', Icon => {
  const tree = render(<Icon fill="#123456" size="lg" />)
  const paths = tree.UNSAFE_getAllByType(Path)
  expect(paths).toHaveLength(3)
  expect(Icon.svgStrokeWidth).toBe(0)
  expect(Icon.svgViewBox).toBe('0 0 30 24')
  expect(tree.UNSAFE_getByType(Svg).props.viewBox).toBe('0 0 30 24')
  for (const path of paths) {
    expect(path.props.fill).toBe('#123456')
    expect(path.props.stroke).toBeUndefined()
  }
  expect(paths[2].props.d).not.toBe(paths[0].props.d)
})

it.each([
  PersonPlus_Stroke2_Corner0_Rounded,
  PersonPlus_Stroke2_Corner2_Rounded,
])(
  'renders both outline person-plus exports without filled silhouettes',
  Icon => {
    const tree = render(<Icon fill="#654321" strokeWidth={2} />)
    const paths = tree.UNSAFE_getAllByType(Path)
    expect(paths).toHaveLength(4)
    expect(Icon.svgViewBox).toBe('0 0 30 24')
    for (const path of paths) {
      expect(path.props.fill).toBe('none')
      expect(path.props.stroke).toBe('#654321')
      expect(path.props.strokeWidth).toBe(2)
    }
  },
)
