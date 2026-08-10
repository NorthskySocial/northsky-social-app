import type * as RN from 'react-native'
import {render, screen} from '@testing-library/react-native'

import {CODE_LINE_HEIGHT, CODE_PADDING_Y} from '#/lib/code/theme'
import {CodeBlock} from './CodeBlock'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint), so the leaves are stubbed. What this file checks is the
 * line slicing and the height caps, which are plain arithmetic on the props.
 */
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: {text: {}, text_contrast_low: {}}}),
  useAlf: () => ({themeName: 'dark'}),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof RN>('react-native').Text,
}))
/* Highlighting is covered by src/lib/code/highlight.test.ts. */
jest.mock('#/lib/code/useHighlighter', () => ({
  useHighlightedLines: (code: string) =>
    code.split('\n').map(line => (line ? [{value: line}] : [])),
}))

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle))
  return (style ?? {}) as Record<string, unknown>
}

function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

const THREE_LINES = 'const a = 1\nconst b = 2\nconst c = 3'

describe('CodeBlock', () => {
  it('renders every line with a gutter number', () => {
    render(<CodeBlock code={THREE_LINES} />)

    expect(screen.getByText('const a = 1')).toBeTruthy()
    expect(screen.getByText('const c = 3')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('marks the code text as user content but not the gutter', () => {
    render(<CodeBlock code="const a = 1" />)

    expect(propsOf(screen.getByText('const a = 1')).emoji).toBe(true)
    // The gutter number is ours, and it must not be selectable with the code.
    expect(propsOf(screen.getByText('1')).selectable).toBe(false)
  })

  it('truncates to maxLines for a collapsed preview', () => {
    render(<CodeBlock code={THREE_LINES} maxLines={2} />)

    expect(screen.getByText('const b = 2')).toBeTruthy()
    expect(screen.queryByText('const c = 3')).toBeNull()
  })

  it('clips a collapsed preview by pixels, because lines wrap', () => {
    // A logical-line slice cannot bound the height once a line wraps, so the
    // clip is in pixels. Only the top padding counts, so the cut lands on a
    // row boundary instead of slicing the next row in half.
    render(<CodeBlock code={THREE_LINES} maxLines={2} />)

    const clipped = screen
      .UNSAFE_getAllByType(jest.requireActual<typeof RN>('react-native').View)
      .map(node => flatStyle(propsOf(node).style).maxHeight)
      .filter(Boolean)
    expect(clipped).toEqual([2 * CODE_LINE_HEIGHT + CODE_PADDING_Y])
  })

  it('caps an expanded block and scrolls within it', () => {
    render(<CodeBlock code={THREE_LINES} maxHeightLines={2} />)

    const scroll = screen.UNSAFE_getByType(
      jest.requireActual<typeof RN>('react-native').ScrollView,
    )
    expect(flatStyle(propsOf(scroll).style).maxHeight).toBe(
      2 * CODE_LINE_HEIGHT + CODE_PADDING_Y * 2,
    )
    // The whole file is present; only the viewport is bounded.
    expect(screen.getByText('const c = 3')).toBeTruthy()
  })

  it('grows to fit when neither cap is given', () => {
    render(<CodeBlock code={THREE_LINES} />)

    const capped = screen
      .UNSAFE_getAllByType(jest.requireActual<typeof RN>('react-native').View)
      .map(node => flatStyle(propsOf(node).style).maxHeight)
      .filter(Boolean)
    expect(capped).toEqual([])
  })

  it('renders an empty snippet without throwing', () => {
    render(<CodeBlock code="" />)
    expect(screen.getByText('1')).toBeTruthy()
  })
})
