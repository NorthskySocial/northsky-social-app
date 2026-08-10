import type * as RN from 'react-native'
import {Text} from 'react-native'
import {render, screen} from '@testing-library/react-native'

import {MONO_FONT} from '#/lib/code/theme'
import {codePart, emphasisTextStyle, textPart} from './RichTextCode'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint). Stub the leaves so the parts under test - which element
 * each token becomes, what text it carries, and which styles it applies - can
 * be exercised against plain React Native primitives.
 */
jest.mock('#/alf', () => {
  const atoms = new Proxy({}, {get: () => ({})})
  return {
    atoms,
    useTheme: () => ({
      atoms: {
        text: {},
        bg_contrast_25: {backgroundColor: '#252525'},
        bg_contrast_50: {backgroundColor: '#505050'},
      },
    }),
    useAlf: () => ({themeName: 'dark'}),
  }
})
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof RN>('react-native').Text,
}))
jest.mock('#/components/CopyCodeButton', () => ({
  // The value goes on a prop, not into the tree, so it cannot collide with the
  // rendered code when a query looks for text.
  CopyCodeButton: ({value}: {value: string}) => {
    const {View} = jest.requireActual<typeof RN>('react-native')
    return <View testID="copy" accessibilityValue={{text: value}} />
  },
}))
/*
 * Highlighting itself is covered by src/lib/code/highlight.test.ts. Standing in
 * for it here keeps these assertions deterministic, drops the grammar load from
 * the render path, and gives a known scope to look for.
 */
jest.mock('#/lib/code/useHighlighter', () => ({
  useHighlightedLines: (code: string) =>
    code
      .split('\n')
      .map(line => (line ? [{scope: 'keyword', value: line}] : [])),
}))

/** Flattens a possibly-nested RN style prop into one object. */
function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle))
  return (style ?? {}) as Record<string, unknown>
}

/** Props of a rendered node, as plain data the assertions can read. */
function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

describe('emphasisTextStyle', () => {
  it('returns undefined when nothing is emphasized', () => {
    expect(emphasisTextStyle(undefined)).toBeUndefined()
  })

  it('maps bold to weight 700', () => {
    // 700, not 600: Geist has no upright 600 face, so font matching can
    // answer a 600 request with the italic cut.
    expect(emphasisTextStyle({bold: true})).toEqual({fontWeight: '700'})
  })

  it('maps italic and strike', () => {
    expect(emphasisTextStyle({italic: true})).toEqual({fontStyle: 'italic'})
    expect(emphasisTextStyle({strike: true})).toEqual({
      textDecorationLine: 'line-through',
    })
  })

  it('combines every mark', () => {
    expect(emphasisTextStyle({bold: true, italic: true, strike: true})).toEqual(
      {
        fontWeight: '700',
        fontStyle: 'italic',
        textDecorationLine: 'line-through',
      },
    )
  })
})

describe('textPart', () => {
  it('returns the bare string when no emphasis applies', () => {
    // Plain prose must stay a raw string so the parent Text keeps one run.
    const part = textPart('moon prism power', 0, undefined)
    expect(part).toEqual({block: false, node: 'moon prism power'})
  })

  it('wraps emphasized text and marks it as user content', () => {
    const part = textPart('makeup', 0, {fontWeight: '700'})
    expect(part.block).toBe(false)

    render(<Text>{part.node}</Text>)
    const node = screen.getByText('makeup')
    expect(propsOf(node).emoji).toBe(true)
    expect(flatStyle(propsOf(node).style)).toMatchObject({fontWeight: '700'})
  })
})

describe('codePart', () => {
  it('renders inline code inline and as user content', () => {
    const part = codePart({type: 'inline', value: 'sailor()'}, 'k', false)
    expect(part.block).toBe(false)

    render(<Text>{part.node}</Text>)
    const node = screen.getByText('sailor()')
    expect(propsOf(node).emoji).toBe(true)
    expect(flatStyle(propsOf(node).style)).toMatchObject({
      fontFamily: MONO_FONT,
    })
  })

  it('strips a stray carriage return from inline code', () => {
    // Inline code renders verbatim, so a CR would otherwise survive.
    const part = codePart({type: 'inline', value: 'a\r\nb'}, 'k', false)
    render(<Text>{part.node}</Text>)
    expect(screen.getByText('a\nb')).toBeTruthy()
  })

  it('keeps a fenced block inline outside full views', () => {
    // A View cannot live inside a Text, and a truncated preview must stay in
    // the text flow so numberOfLines still applies.
    const part = codePart(
      {type: 'fence', value: 'const a = 1', lang: 'ts'},
      'k',
      false,
    )
    expect(part.block).toBe(false)

    render(<Text>{part.node}</Text>)
    expect(screen.getByText('const a = 1')).toBeTruthy()
    expect(screen.queryByTestId('copy')).toBeNull()
  })

  it('renders a fenced block as a panel in full views', () => {
    const part = codePart(
      {type: 'fence', value: 'const a = 1\nconst b = 2', lang: 'ts'},
      'k',
      true,
    )
    expect(part.block).toBe(true)

    render(<>{part.node}</>)
    // The panel adds the copy control; the inline form has nowhere to put it.
    expect(propsOf(screen.getByTestId('copy')).accessibilityValue).toEqual({
      text: 'const a = 1\nconst b = 2',
    })
    expect(screen.getByText('const a = 1')).toBeTruthy()
    expect(screen.getByText('const b = 2')).toBeTruthy()
  })

  it('passes selectable through to a panel', () => {
    // selectable sits on the wrapping Text, not on the leaf span, so ask
    // whether anything in the panel carries it.
    const on = codePart({type: 'fence', value: 'zoisite'}, 'k', true, true)
    render(<>{on.node}</>)
    expect(screen.UNSAFE_queryAllByProps({selectable: true})).not.toHaveLength(
      0,
    )

    screen.unmount()

    const off = codePart({type: 'fence', value: 'zoisite'}, 'k', true)
    render(<>{off.node}</>)
    expect(screen.UNSAFE_queryAllByProps({selectable: true})).toHaveLength(0)
  })
})
