import {useState} from 'react'
import {Pressable} from 'react-native'
import {describe, expect, it, jest} from '@jest/globals'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'

import * as Dialog from '#/components/Dialog'
import {type BluemojiItemView} from '../../types'
import {AddToPackDialog} from '../AddToPackDialog'
import {InstallItemDialog} from '../InstallItemDialog'

jest.mock('#/components/Dialog', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (
    require('../../__tests__/fakeDialog') as typeof import('../../__tests__/fakeDialog')
  ).fakeDialogModule(),
)
// The dialogs' contents are not under test; only whether the shell is mounted.
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: {}, palette: {}}),
}))
jest.mock('#/components/Admonition', () => ({Admonition: () => null}))
jest.mock('#/components/Button', () => ({
  Button: () => null,
  ButtonIcon: () => null,
  ButtonText: () => null,
}))
jest.mock('#/components/forms/TextField', () => ({
  Root: () => null,
  LabelText: () => null,
}))
jest.mock('#/components/Loader', () => ({Loader: () => null}))
jest.mock('#/components/Toast', () => ({show: jest.fn()}))
jest.mock('#/components/Typography', () => ({Text: () => null}))
jest.mock('../EmojiTile', () => ({EmojiTile: () => null}))
jest.mock('../../ProvenanceLine', () => ({ProvenanceLine: () => null}))
jest.mock('../queries', () => ({
  useInstallItem: () => ({mutateAsync: jest.fn(), isPending: false}),
  useAddToPack: () => ({mutateAsync: jest.fn()}),
  useMyPacks: () => ({data: {pages: []}, isPending: false}),
}))

i18n.load('en', {})
i18n.activate('en')

const item: BluemojiItemView = {
  uri: 'at://did:plc:a/blue.moji.collection.item/cat',
  did: 'did:plc:a',
  name: ':cat:',
  formats: {},
}

/** Mirrors the screens: choosing an item and opening happen in one handler. */
function Screen({Dialog: Under}: {Dialog: 'install' | 'addToPack'}) {
  const control = Dialog.useDialogControl()
  const [target, setTarget] = useState<BluemojiItemView>()
  return (
    <>
      <Pressable
        testID="press"
        accessibilityRole="button"
        onPress={() => {
          setTarget(item)
          control.open()
        }}
      />
      {Under === 'install' ? (
        <InstallItemDialog
          control={control}
          item={target}
          haveAliases={new Set()}
        />
      ) : (
        <AddToPackDialog control={control} item={target} />
      )}
    </>
  )
}

describe.each([['install' as const], ['addToPack' as const]])(
  'first press with no item chosen yet (%s)',
  which => {
    it('opens the dialog', () => {
      render(
        <I18nProvider i18n={i18n}>
          <Screen Dialog={which} />
        </I18nProvider>,
      )
      expect(screen.queryByTestId('dialog-open')).toBeNull()
      act(() => {
        fireEvent.press(screen.getByTestId('press'))
      })
      expect(screen.getByTestId('dialog-open')).toBeTruthy()
    })
  },
)
