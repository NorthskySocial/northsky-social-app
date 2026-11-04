import Svg, {LinearGradient, Path, Stop} from 'react-native-svg'
import {render} from '@testing-library/react-native'

import * as brandEnvelope from '#/components/icons/brands/EnvelopeNotification'
import * as brandStarterPack from '#/components/icons/brands/StarterPack'
import {Envelope_Filled_Stroke2_Corner0_Rounded} from '#/components/icons/Envelope'
import * as envelope from '#/components/icons/EnvelopeNotification'
import * as starterPack from '#/components/icons/StarterPack'
import mapping from '../mapping.json'

jest.mock('#/alf', () => ({
  tokens: {
    gradients: {
      primary: {
        values: [
          [0, '#BB0FFB'],
          [1, '#2AFFBA'],
        ],
      },
    },
  },
  useTheme: () => ({palette: {primary_500: '#0000ff'}}),
}))

describe('notification icon compatibility routes', () => {
  it('routes both StarterPack exports to the migrated module', () => {
    expect(Object.keys(brandStarterPack).sort()).toEqual(
      Object.keys(starterPack).sort(),
    )
    expect(brandStarterPack.StarterPackMultiPathLarge).toBe(
      starterPack.StarterPackMultiPathLarge,
    )
    expect(brandStarterPack.StarterPack_Stroke2_Corner0_Rounded).toBe(
      starterPack.StarterPack_Stroke2_Corner0_Rounded,
    )
    expect(
      brandStarterPack.StarterPack_Stroke2_Corner0_Rounded.svgStrokeWidth,
    ).toBe(1.75)
  })

  it('routes EnvelopeNotification to the mapped filled mail with a dot', () => {
    const Icon = brandEnvelope.EnvelopeNotification_Filled_Corner2_Rounded
    expect(Object.keys(brandEnvelope)).toEqual(Object.keys(envelope))
    expect(Icon).toBe(envelope.EnvelopeNotification_Filled_Corner2_Rounded)
    expect(mapping['EnvelopeNotification.tsx']).toEqual({
      EnvelopeNotification_Filled_Corner2_Rounded: {
        tabler: 'mail-dot',
        variant: 'filled',
      },
    })
    expect(Icon.svgPaths).toHaveLength(3)
    expect(Icon.svgPaths[2]).toBe('M23 4a3 3 0 1 0 -6 0a3 3 0 0 0 6 0z')
    expect(Icon.svgPaths).not.toEqual(
      Envelope_Filled_Stroke2_Corner0_Rounded.svgPaths,
    )
    expect(Icon.svgStrokeWidth).toBe(0)
  })

  it.each([
    [
      'StarterPack',
      brandStarterPack.StarterPack_Stroke2_Corner0_Rounded,
      'stroke',
    ],
    [
      'EnvelopeNotification',
      brandEnvelope.EnvelopeNotification_Filled_Corner2_Rounded,
      'fill',
    ],
  ] as const)(
    'renders %s paths with isolated native SVG gradients',
    (_, Icon, colorProp) => {
      const first = render(<Icon gradient="primary" size="2xs" />)
      const second = render(<Icon gradient="primary" size="2xl" />)
      const firstGradient = first.UNSAFE_getByType(LinearGradient).props
      const secondGradient = second.UNSAFE_getByType(LinearGradient).props
      expect(firstGradient.id).not.toBe(secondGradient.id)
      expect(first.UNSAFE_getAllByType(Stop)).toHaveLength(2)
      expect(first.UNSAFE_getByType(Svg).props.width).toBe(8)
      expect(second.UNSAFE_getByType(Svg).props.width).toBe(32)
      for (const path of first.UNSAFE_getAllByType(Path)) {
        expect(path.props[colorProp]).toBe(`url(#${firstGradient.id})`)
        if (colorProp === 'fill') {
          expect(path.props.stroke).toBeUndefined()
          expect(path.props.fillRule).toBeUndefined()
        } else {
          expect(path.props.fill).toBe('none')
        }
      }
    },
  )
})
