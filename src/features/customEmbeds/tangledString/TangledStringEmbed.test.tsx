import {type ReactElement} from 'react'
import type * as RN from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  fireEvent,
  render as rtlRender,
  screen,
} from '@testing-library/react-native'

import {PREVIEW_LINES, SCROLL_LINES} from '#/lib/code/theme'
import {type CustomEmbedComponentProps} from '#/features/customEmbeds/types'
import {TangledStringEmbed} from './TangledStringEmbed'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint). The card frame, the code panel and the query are covered by
 * their own tests, so they are stubbed down to the props this file asserts on:
 * which state the embed renders, and what it hands the panel.
 */
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({
    atoms: {text_contrast_low: {}, text_contrast_medium: {}},
  }),
  useAlf: () => ({themeName: 'dark'}),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof RN>('react-native').Text,
}))
jest.mock('#/components/Divider', () => ({
  Divider: () => {
    const {View} = jest.requireActual<typeof RN>('react-native')
    return <View testID="divider" />
  },
}))
jest.mock('#/components/Loader', () => ({
  Loader: () => {
    const {View} = jest.requireActual<typeof RN>('react-native')
    return <View testID="loader" />
  },
}))
jest.mock('#/components/CopyCodeButton', () => ({
  CopyCodeButton: () => null,
}))
jest.mock('#/components/icons/Chevron', () => ({
  ChevronBottom_Stroke2_Corner0_Rounded: () => null,
  ChevronTop_Stroke2_Corner0_Rounded: () => null,
}))
jest.mock('#/view/com/util/UserAvatar', () => ({
  UserAvatar: () => {
    const {View} = jest.requireActual<typeof RN>('react-native')
    return <View testID="avatar" />
  },
}))
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual<typeof RN>('react-native')
  return {
    Button: ({
      label,
      onPress,
      children,
    }: {
      label: string
      onPress?: () => void
      children: React.ReactNode
    }) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: ({children}: {children: React.ReactNode}) => (
      <Text>{children}</Text>
    ),
    ButtonIcon: () => null,
  }
})
jest.mock('./TangledStringCard', () => {
  const {Text, View} = jest.requireActual<typeof RN>('react-native')
  return {
    TangledStringCard: ({
      filename,
      children,
    }: {
      filename: string
      children: React.ReactNode
    }) => (
      <View>
        <Text testID="card-filename">{filename}</Text>
        {children}
      </View>
    ),
    TangledStringLink: ({children}: {children: React.ReactNode}) => (
      <View testID="footer-link">{children}</View>
    ),
  }
})
jest.mock('./CodeBlock', () => ({
  CodeBlock: ({
    code,
    filename,
    maxLines,
    maxHeightLines,
  }: {
    code: string
    filename?: string
    maxLines?: number
    maxHeightLines?: number
  }) => {
    const {Text, View} = jest.requireActual<typeof RN>('react-native')
    return (
      <View
        testID="code-block"
        accessibilityValue={{
          text: JSON.stringify({filename, maxLines, maxHeightLines}),
        }}>
        <Text>{code}</Text>
      </View>
    )
  },
}))
jest.mock('./queries', () => ({useTangledStringQuery: () => mockQuery}))
jest.mock('#/state/queries/profile', () => ({
  useProfileQuery: () => mockProfile,
}))

type QueryState = {
  isLoading: boolean
  isError: boolean
  data?: {did: string; value: {contents: string; filename?: string}}
}

let mockQuery: QueryState
let mockProfile: {data?: {handle: string; displayName?: string}}

i18n.loadAndActivate({locale: 'en', messages: {}})

function render(ui: ReactElement) {
  return rtlRender(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)
}

const URI = 'https://tangled.org/strings/usagi.test/rkey'

function view(title = ''): CustomEmbedComponentProps['view'] {
  return {uri: URI, title, description: ''}
}

/** Props of a rendered node, as plain data the assertions can read. */
function propsOf(node: unknown): Record<string, unknown> {
  return (node as {props: Record<string, unknown>}).props
}

/** Reads the props the embed handed the code panel. */
function codeBlockProps(): {
  filename?: string
  maxLines?: number
  maxHeightLines?: number
} {
  const {text} = propsOf(screen.getByTestId('code-block'))
    .accessibilityValue as {text: string}
  return JSON.parse(text) as ReturnType<typeof codeBlockProps>
}

beforeEach(() => {
  mockQuery = {isLoading: true, isError: false}
  mockProfile = {}
})

describe('TangledStringEmbed', () => {
  it('shows a loader while the record is in flight', () => {
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByTestId('loader')).toBeTruthy()
    expect(screen.queryByTestId('code-block')).toBeNull()
    // Nothing is known yet, so no footer and no divider.
    expect(screen.queryByTestId('divider')).toBeNull()
  })

  it('explains a failed read instead of rendering an empty panel', () => {
    mockQuery = {isLoading: false, isError: true}
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByText("Couldn't load this snippet.")).toBeTruthy()
    expect(screen.queryByTestId('code-block')).toBeNull()
    expect(screen.queryByTestId('divider')).toBeNull()
  })

  it('renders the snippet and its line count', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {
        did: 'did:plc:usagi',
        value: {contents: 'const a = 1\nconst b = 2', filename: 'moon.ts'},
      },
    }
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByText('const a = 1\nconst b = 2')).toBeTruthy()
    expect(screen.getByText('2 lines')).toBeTruthy()
    expect(screen.getByTestId('divider')).toBeTruthy()
  })

  it('renders an empty snippet as empty code, not as an error', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: ''}},
    }
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByTestId('code-block')).toBeTruthy()
    expect(screen.queryByText("Couldn't load this snippet.")).toBeNull()
  })

  it('prefers the record filename over the link title', () => {
    // Language detection keys off the extension, and a link title has none.
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {
        did: 'did:plc:usagi',
        value: {contents: 'x', filename: 'moon.ts'},
      },
    }
    render(<TangledStringEmbed view={view('A snippet')} />)

    expect(propsOf(screen.getByTestId('card-filename')).children).toBe(
      'moon.ts',
    )
    expect(codeBlockProps().filename).toBe('moon.ts')
  })

  it('never passes the link title to the code panel', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: 'x'}},
    }
    render(<TangledStringEmbed view={view('A snippet')} />)

    expect(propsOf(screen.getByTestId('card-filename')).children).toBe(
      'A snippet',
    )
    expect(codeBlockProps().filename).toBeUndefined()
  })

  it('collapses a long snippet and offers to expand it', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {
        did: 'did:plc:usagi',
        value: {contents: 'line\n'.repeat(PREVIEW_LINES + 5)},
      },
    }
    render(<TangledStringEmbed view={view()} />)

    // JSON drops an undefined value, so read each cap on its own.
    expect(codeBlockProps().maxLines).toBe(PREVIEW_LINES)
    expect(codeBlockProps().maxHeightLines).toBeUndefined()

    fireEvent.press(screen.getByLabelText('Show more'))

    // Expanded: the whole file, in a viewport that scrolls internally so a
    // long snippet cannot take over the screen.
    expect(codeBlockProps().maxLines).toBeUndefined()
    expect(codeBlockProps().maxHeightLines).toBe(SCROLL_LINES)
    expect(screen.getByLabelText('Show less')).toBeTruthy()
  })

  it('offers no expand control for a short snippet', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: 'one line'}},
    }
    render(<TangledStringEmbed view={view()} />)

    expect(screen.queryByLabelText('Show more')).toBeNull()
    expect(screen.getByText('1 line')).toBeTruthy()
  })

  it('shows the author byline when the profile cache has one', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: 'x'}},
    }
    mockProfile = {data: {handle: 'usagi.test', displayName: 'Usagi'}}
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByTestId('avatar')).toBeTruthy()
    expect(screen.getByText('Usagi')).toBeTruthy()
  })

  it('falls back to the handle when the author has no display name', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: 'x'}},
    }
    mockProfile = {data: {handle: 'usagi.test'}}
    render(<TangledStringEmbed view={view()} />)

    expect(screen.getByText(/@usagi\.test/)).toBeTruthy()
  })

  it('renders the snippet without a byline when the profile is unknown', () => {
    mockQuery = {
      isLoading: false,
      isError: false,
      data: {did: 'did:plc:usagi', value: {contents: 'x'}},
    }
    render(<TangledStringEmbed view={view()} />)

    expect(screen.queryByTestId('avatar')).toBeNull()
    expect(screen.getByTestId('code-block')).toBeTruthy()
  })
})
