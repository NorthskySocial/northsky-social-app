import {type ReactElement} from 'react'
import type * as RN from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {render as rtlRender, screen} from '@testing-library/react-native'

import {type CustomEmbedComponentProps} from '#/features/customEmbeds/types'
import {TangledStringPreview} from './TangledStringPreview'

/*
 * ALF's barrel reaches dialogs, lists and native modules that a unit test
 * cannot boot (see src/features/customEmbeds/__tests__/registry.test.ts for the
 * same constraint). The card frame is covered by TangledStringCard.test.tsx, so
 * it is stubbed down to its filename and children here.
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
jest.mock('./TangledStringCard', () => ({
  TangledStringCard: ({
    filename,
    children,
  }: {
    filename: string
    children: React.ReactNode
  }) => {
    const {Text, View} = jest.requireActual<typeof RN>('react-native')
    return (
      <View>
        <Text>{filename}</Text>
        {children}
      </View>
    )
  },
}))

i18n.loadAndActivate({locale: 'en', messages: {}})

function render(ui: ReactElement) {
  return rtlRender(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)
}

function view(
  uri: CustomEmbedComponentProps['view']['uri'],
  title?: string,
): CustomEmbedComponentProps['view'] {
  return {uri, title: title ?? '', description: ''}
}

describe('TangledStringPreview', () => {
  it('shows the owner handle as the byline', () => {
    render(
      <TangledStringPreview
        view={view('https://tangled.org/strings/usagi.test/rkey')}
      />,
    )

    // sanitizeHandle wraps the handle in directional isolate marks, so match
    // on the handle itself rather than on the exact string.
    expect(screen.getByText(/@usagi\.test/)).toBeTruthy()
    expect(screen.getByTestId('divider')).toBeTruthy()
  })

  it('omits the byline for a DID owner, which would read as noise', () => {
    render(
      <TangledStringPreview
        view={view('https://tangled.org/strings/did:plc:usagi/rkey')}
      />,
    )

    expect(screen.queryByText(/did:plc:usagi/)).toBeNull()
    expect(screen.queryByTestId('divider')).toBeNull()
  })

  it('omits the byline when the link is not a snippet URL', () => {
    render(<TangledStringPreview view={view('https://example.com/thing')} />)

    expect(screen.queryByTestId('divider')).toBeNull()
  })

  it('names the card from the link title', () => {
    render(
      <TangledStringPreview
        view={view('https://tangled.org/strings/usagi.test/rkey', 'moon.ts')}
      />,
    )

    expect(screen.getByText('moon.ts')).toBeTruthy()
  })

  it('falls back to a generic name when the link has no title', () => {
    render(
      <TangledStringPreview
        view={view('https://tangled.org/strings/usagi.test/rkey')}
      />,
    )

    expect(screen.getByText('Snippet')).toBeTruthy()
  })

  it('always says what the card is', () => {
    render(
      <TangledStringPreview
        view={view('https://tangled.org/strings/usagi.test/rkey')}
      />,
    )

    expect(screen.getByText('Code snippet')).toBeTruthy()
  })
})
