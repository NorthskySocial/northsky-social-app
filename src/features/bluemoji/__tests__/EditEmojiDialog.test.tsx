import {useState} from 'react'
import {Pressable, Text, TextInput} from 'react-native'
import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import * as Dialog from '#/components/Dialog'
import {EditEmojiDialog} from '../EditEmojiDialog'
import {type BluemojiItemView} from '../types'

jest.mock('#/components/Dialog', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('./fakeDialog') as typeof import('./fakeDialog')).fakeDialogModule(),
)
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: {}, palette: {}}),
}))
jest.mock('#/components/Admonition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as typeof import('react-native')
  return {
    Admonition: ({children}: {children: React.ReactNode}) => (
      <rn.Text>{children}</rn.Text>
    ),
  }
})
jest.mock('#/components/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as typeof import('react-native')
  return {
    Button: ({
      testID,
      onPress,
      disabled,
      children,
    }: {
      testID?: string
      onPress?: () => void
      disabled?: boolean
      children?: React.ReactNode
    }) => (
      <rn.Pressable
        testID={testID}
        onPress={disabled ? undefined : onPress}
        accessibilityState={{disabled: !!disabled}}
        accessibilityRole="button">
        {children}
      </rn.Pressable>
    ),
    ButtonText: ({children}: {children: React.ReactNode}) => (
      <rn.Text>{children}</rn.Text>
    ),
    ButtonIcon: () => null,
  }
})
jest.mock('#/components/forms/TextField', () => ({
  Root: ({children}: {children: React.ReactNode}) => children,
  LabelText: () => null,
}))
jest.mock('#/components/forms/Toggle', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as typeof import('react-native')
  return {
    Item: ({
      name,
      value,
      onChange,
    }: {
      name: string
      value: boolean
      onChange: (v: boolean) => void
    }) => (
      <rn.Pressable
        testID={`toggle-${name}`}
        accessibilityRole="button"
        onPress={() => onChange(!value)}
      />
    ),
    Checkbox: () => null,
    LabelText: () => null,
  }
})
jest.mock('#/components/Loader', () => ({Loader: () => null}))
jest.mock('#/components/Toast', () => ({show: jest.fn()}))
jest.mock('#/components/Typography', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Text: (require('react-native') as typeof import('react-native')).Text,
}))
jest.mock('expo-image', () => ({Image: () => null}))
jest.mock('../ProvenanceFields', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native') as typeof import('react-native')
  return {
    provenanceProblem: () => null,
    ProvenanceFields: ({
      license,
      source,
      onLicenseChange,
      onSourceChange,
    }: {
      license: string
      source: string
      onLicenseChange: (v: string) => void
      onSourceChange: (v: string) => void
    }) => (
      <>
        <rn.TextInput
          testID="license"
          value={license}
          onChangeText={onLicenseChange}
        />
        <rn.TextInput
          testID="source"
          value={source}
          onChangeText={onSourceChange}
        />
      </>
    ),
  }
})
jest.mock('../packs/errors', () => ({describeError: () => 'ERROR SHOWN'}))

const mockEdit = jest.fn<(args: unknown) => Promise<unknown>>()
const mockRemove = jest.fn<(item: unknown) => Promise<unknown>>()
jest.mock('../useEditItem', () => ({
  useEditItem: () => ({
    mutateAsync: (a: unknown) => mockEdit(a),
    isPending: false,
  }),
  useDeleteItem: () => ({
    mutateAsync: (i: unknown) => mockRemove(i),
    isPending: false,
  }),
}))

i18n.load('en', {})
i18n.activate('en')

const item: BluemojiItemView = {
  uri: 'at://did:plc:me/blue.moji.collection.item/cat',
  cid: 'bafyV1',
  did: 'did:plc:me',
  name: ':cat:',
  alt: 'a cat',
  adultOnly: false,
  license: 'CC-BY-4.0',
  source: 'https://example.com/art',
  formats: {},
}

/** Mirrors the settings screen: choosing the emoji and opening happen together. */
function Screen() {
  const control = Dialog.useDialogControl()
  const [target, setTarget] = useState<BluemojiItemView>()
  return (
    <>
      <Pressable
        testID="editEmoji-:cat:"
        accessibilityRole="button"
        onPress={() => {
          setTarget(item)
          control.open()
        }}
      />
      <EditEmojiDialog control={control} item={target} />
    </>
  )
}

function open() {
  render(
    <I18nProvider i18n={i18n}>
      <Screen />
    </I18nProvider>,
  )
  act(() => {
    fireEvent.press(screen.getByTestId('editEmoji-:cat:'))
  })
}

beforeEach(() => {
  mockEdit.mockReset().mockResolvedValue({cid: 'bafyV2'})
  mockRemove.mockReset().mockResolvedValue(undefined)
})

describe('EditEmojiDialog', () => {
  it('opens on the very first press, before any emoji was chosen', () => {
    render(
      <I18nProvider i18n={i18n}>
        <Screen />
      </I18nProvider>,
    )
    expect(screen.queryByTestId('dialog-open')).toBeNull()
    act(() => {
      fireEvent.press(screen.getByTestId('editEmoji-:cat:'))
    })
    expect(screen.getByTestId('dialog-open')).toBeTruthy()
    expect(screen.getByTestId('editEmojiSave')).toBeTruthy()
  })

  it('saves only the field that was changed', async () => {
    open()
    fireEvent.press(screen.getByTestId('toggle-edit-adult'))
    await act(() => {
      fireEvent.press(screen.getByTestId('editEmojiSave'))
      return Promise.resolve()
    })
    expect(mockEdit).toHaveBeenCalledTimes(1)
    expect(mockEdit).toHaveBeenCalledWith({item, changes: {adultOnly: true}})
  })

  it('does not write anything when nothing changed', async () => {
    open()
    await act(() => {
      fireEvent.press(screen.getByTestId('editEmojiSave'))
      return Promise.resolve()
    })
    expect(mockEdit).not.toHaveBeenCalled()
  })

  it('shows the error when a save is refused as stale', async () => {
    mockEdit.mockRejectedValue(new Error('stale'))
    open()
    fireEvent.changeText(screen.getByTestId('license'), 'MIT')
    await act(() => {
      fireEvent.press(screen.getByTestId('editEmojiSave'))
      return Promise.resolve()
    })
    await waitFor(() => expect(screen.getByText('ERROR SHOWN')).toBeTruthy())
  })

  it('asks before deleting, and can be cancelled', () => {
    open()
    expect(screen.queryByTestId('editEmojiDeleteConfirm')).toBeNull()
    fireEvent.press(screen.getByTestId('editEmojiDelete'))
    expect(screen.getByTestId('editEmojiDeleteConfirm')).toBeTruthy()
    fireEvent.press(screen.getByTestId('editEmojiDeleteCancel'))
    expect(screen.queryByTestId('editEmojiDeleteConfirm')).toBeNull()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('deletes only after confirmation', async () => {
    open()
    fireEvent.press(screen.getByTestId('editEmojiDelete'))
    await act(() => {
      fireEvent.press(screen.getByTestId('editEmojiDeleteConfirm'))
      return Promise.resolve()
    })
    expect(mockRemove).toHaveBeenCalledWith(item)
  })
})

// keep the unused-import linter honest about helpers the mocks rely on
void Text
void TextInput
