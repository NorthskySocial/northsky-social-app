import type * as RN from 'react-native'
import {Text} from 'react-native'
import {render, screen} from '@testing-library/react-native'

import {CodeSpans} from './CodeSpans'
import {DARK_COLORS} from './palette'
import {MONO_FONT} from './theme'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint), so the leaves are stubbed. The palette is real, which is
 * the point: the scope-to-color mapping is what this file decides.
 */
jest.mock('#/alf', () => ({
  useAlf: () => ({themeName: 'dark'}),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof RN>('react-native').Text,
}))

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle))
  return (style ?? {}) as Record<string, unknown>
}

/** Props of a rendered node, as plain data the assertions can read. */
function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

describe('CodeSpans', () => {
  it('renders a space for an empty line so it still occupies a row', () => {
    render(
      <Text testID="line">
        <CodeSpans line={[]} />
      </Text>,
    )
    // A bare space, not a nested span: nothing to color, but the row stands.
    expect(screen.toJSON()).toMatchObject({children: [' ']})
  })

  it('colors a span by its scope', () => {
    render(
      <Text>
        <CodeSpans line={[{scope: 'keyword', value: 'const'}]} />
      </Text>,
    )
    expect(flatStyle(propsOf(screen.getByText('const')).style)).toMatchObject({
      color: DARK_COLORS.keyword,
    })
  })

  it('falls back to the first segment of a compound scope', () => {
    render(
      <Text>
        <CodeSpans line={[{scope: 'title.method_', value: 'greet'}]} />
      </Text>,
    )
    expect(flatStyle(propsOf(screen.getByText('greet')).style)).toMatchObject({
      color: DARK_COLORS.title,
    })
  })

  it('leaves an unscoped span to inherit the base text color', () => {
    render(
      <Text>
        <CodeSpans line={[{value: '=>'}]} />
      </Text>,
    )
    expect(
      flatStyle(propsOf(screen.getByText('=>')).style).color,
    ).toBeUndefined()
  })

  it('re-applies the monospace family and marks spans as user content', () => {
    // Each nested Text re-applies a font family, so a span that omits it
    // reverts to the body UI font.
    render(
      <Text>
        <CodeSpans line={[{scope: 'string', value: '"usagi"'}]} />
      </Text>,
    )
    const node = screen.getByText('"usagi"')
    expect(propsOf(node).emoji).toBe(true)
    expect(flatStyle(propsOf(node).style)).toMatchObject({
      fontFamily: MONO_FONT,
    })
  })

  it('renders every span of a line in order', () => {
    render(
      <Text testID="line">
        <CodeSpans
          line={[
            {scope: 'keyword', value: 'const'},
            {value: ' x = '},
            {scope: 'number', value: '1'},
          ]}
        />
      </Text>,
    )
    expect(screen.getByTestId('line')).toHaveTextContent('const x = 1')
  })
})
