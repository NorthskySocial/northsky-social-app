import {type ReactElement} from 'react'
import type * as RN from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  fireEvent,
  render as rtlRender,
  screen,
} from '@testing-library/react-native'

import {TangledStringCard, TangledStringLink} from './TangledStringCard'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint). The Link stub keeps its props on the tree so the card's
 * contract - where it points, that it proxies, and that it reports an open -
 * can be read back.
 */
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({
    atoms: {
      border_contrast_low: {},
      text_contrast_low: {},
      text_contrast_medium: {},
    },
  }),
  useAlf: () => ({themeName: 'dark'}),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof RN>('react-native').Text,
}))
jest.mock('#/components/icons/Code', () => ({
  Code_Stroke2_Corner2_Rounded: () => null,
}))
jest.mock('#/lib/haptics', () => ({useHaptics: () => mockPlayHaptic}))
jest.mock('#/components/Link', () => ({
  Link: ({
    label,
    to,
    shouldProxy,
    onPress,
    children,
  }: {
    label: string
    to: string
    shouldProxy?: boolean
    onPress?: () => void
    children: React.ReactNode
  }) => {
    const {Pressable} = jest.requireActual<typeof RN>('react-native')
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        testID={`link:${to}`}
        accessibilityState={{selected: !!shouldProxy}}
        onPress={onPress}>
        {children}
      </Pressable>
    )
  },
}))

const mockPlayHaptic = jest.fn()

const URI = 'https://tangled.org/strings/usagi.test/rkey'

// No catalog: Lingui then renders each message id, which for a macro string is
// the English source. That is exactly what these assertions read.
i18n.loadAndActivate({locale: 'en', messages: {}})

function render(ui: ReactElement) {
  return rtlRender(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)
}

function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('TangledStringCard', () => {
  it('links the filename back to the snippet and proxies the open', () => {
    render(
      <TangledStringCard uri={URI} filename="moon.ts">
        {null}
      </TangledStringCard>,
    )

    // The header carries two links to the same URI - the filename and the
    // host - so query by label rather than by target.
    const link = screen.getByLabelText('Open moon.ts on tangled.org')
    expect(propsOf(link).testID).toBe(`link:${URI}`)
    // shouldProxy routes the tap through the app's own link handling.
    expect(propsOf(link).accessibilityState).toEqual({selected: true})
    expect(screen.getByText('moon.ts')).toBeTruthy()
  })

  it('shows the host so the reader knows where the tap leads', () => {
    render(
      <TangledStringCard uri={URI} filename="moon.ts">
        {null}
      </TangledStringCard>,
    )
    expect(screen.getByText('tangled.org')).toBeTruthy()
  })

  it('reports an open and plays a haptic when the header is tapped', () => {
    const onOpen = jest.fn()
    render(
      <TangledStringCard uri={URI} filename="moon.ts" onOpen={onOpen}>
        {null}
      </TangledStringCard>,
    )

    fireEvent.press(screen.getByLabelText('Open moon.ts on tangled.org'))

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(mockPlayHaptic).toHaveBeenCalledWith('Light')
  })

  it('renders its children below the header', () => {
    const {Text} = jest.requireActual<typeof RN>('react-native')
    render(
      <TangledStringCard uri={URI} filename="moon.ts">
        <Text>body</Text>
      </TangledStringCard>,
    )
    expect(screen.getByText('body')).toBeTruthy()
  })
})

describe('TangledStringLink', () => {
  it('reports an open without a filename in its label', () => {
    const onOpen = jest.fn()
    const {Text} = jest.requireActual<typeof RN>('react-native')
    render(
      <TangledStringLink uri={URI} onOpen={onOpen}>
        <Text>25 lines</Text>
      </TangledStringLink>,
    )

    const link = screen.getByTestId(`link:${URI}`)
    expect(propsOf(link).accessibilityLabel).toBe('Open on tangled.org')

    fireEvent.press(link)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('survives a missing onOpen', () => {
    const {Text} = jest.requireActual<typeof RN>('react-native')
    render(
      <TangledStringLink uri={URI}>
        <Text>25 lines</Text>
      </TangledStringLink>,
    )
    fireEvent.press(screen.getByTestId(`link:${URI}`))
    expect(mockPlayHaptic).toHaveBeenCalledWith('Light')
  })
})
