import {type ReactElement, type ReactNode} from 'react'
import type * as RN from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  fireEvent,
  render as rtlRender,
  screen,
} from '@testing-library/react-native'

import {ChatServiceWarning} from '#/features/chatServiceWarning/ChatServiceWarning'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/tangledString tests for the same
 * constraint), so the leaves are stubbed. What this file checks is the
 * component's own logic: visibility, the profile links, and the persistence of
 * the dismissal.
 */

/* In-memory stand-in for the MMKV-backed device storage. */
const mockStore = new Map<string, unknown>()
jest.mock('#/storage', () => ({
  device: {
    get: ([key]: [string]) => mockStore.get(key),
    set: ([key]: [string], data: unknown) => mockStore.set(key, data),
  },
  useStorage: (storage: unknown, [key]: [string]) => {
    const react = jest.requireActual<typeof import('react')>('react')
    const [value, setValue] = react.useState(mockStore.get(key))
    return [
      value,
      (data: unknown) => {
        mockStore.set(key, data)
        setValue(data)
      },
    ]
  },
}))

jest.mock('#/components/Admonition', () => {
  const {Text, View} = jest.requireActual<typeof RN>('react-native')
  const passthrough = ({children}: {children: ReactNode}) => (
    <View>{children}</View>
  )
  return {
    Outer: ({children}: {children: ReactNode}) => (
      <View testID="admonition">{children}</View>
    ),
    Row: passthrough,
    Content: passthrough,
    Icon: () => null,
    Text: ({children}: {children: ReactNode}) => <Text>{children}</Text>,
  }
})

jest.mock('#/components/Button', () => {
  const {Pressable} = jest.requireActual<typeof RN>('react-native')
  return {
    Button: ({
      label,
      onPress,
      children,
    }: {
      label: string
      onPress?: () => void
      children: ReactNode
    }) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonIcon: () => null,
  }
})

jest.mock('#/components/icons/Times', () => ({
  TimesLarge_Stroke2_Corner0_Rounded: () => null,
}))

jest.mock('#/components/Link', () => {
  const {Text} = jest.requireActual<typeof RN>('react-native')
  return {
    InlineLinkText: ({to, children}: {to: string; children: ReactNode}) => (
      <Text testID="inline-link" accessibilityValue={{text: to}}>
        {children}
      </Text>
    ),
  }
})

i18n.loadAndActivate({locale: 'en', messages: {}})

function render(ui: ReactElement) {
  return rtlRender(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)
}

beforeEach(() => {
  mockStore.clear()
})

describe('ChatServiceWarning', () => {
  it('renders the warning with links to both E2E service profiles', () => {
    render(<ChatServiceWarning />)

    expect(screen.getByTestId('admonition')).toBeTruthy()
    const links = screen.getAllByTestId('inline-link')
    const targets = links.map(
      link =>
        (link as unknown as {props: {accessibilityValue: {text: string}}}).props
          .accessibilityValue.text,
    )
    expect(targets).toEqual(['/profile/germnetwork.com', '/profile/signal.org'])
  })

  it('renders nothing when already dismissed', () => {
    mockStore.set('chatServiceWarningDismissed', true)
    render(<ChatServiceWarning />)

    expect(screen.queryByTestId('admonition')).toBeNull()
  })

  it('hides and persists the flag when dismissed', () => {
    render(<ChatServiceWarning />)

    fireEvent.press(screen.getByLabelText('Dismiss chat service warning'))

    expect(screen.queryByTestId('admonition')).toBeNull()
    expect(mockStore.get('chatServiceWarningDismissed')).toBe(true)
  })
})
