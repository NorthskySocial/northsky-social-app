import {useEffect, useState} from 'react'
import {Text, TextInput} from 'react-native'

/**
 * A stand-in for `#/components/Dialog` that keeps the one behaviour the real
 * one has which bit us: `control.open()` does nothing until `Dialog.Outer` has
 * mounted, because that is when the real open function attaches. A dialog that
 * is only rendered after the press that opens it therefore never opens.
 */
export function fakeDialogModule() {
  type Impl = {open: () => void; close: (cb?: () => void) => void}
  const noop: Impl = {open: () => {}, close: () => {}}

  return {
    useDialogControl() {
      const [control] = useState(() => {
        const c = {
          impl: noop,
          open: () => c.impl.open(),
          close: (cb?: () => void) => c.impl.close(cb),
        }
        return c
      })
      return control
    },
    Outer({
      control,
      children,
    }: {
      control: {impl: Impl}
      children?: React.ReactNode
    }) {
      const [open, setOpen] = useState(false)
      useEffect(() => {
        control.impl = {
          open: () => setOpen(true),
          close: cb => {
            setOpen(false)
            cb?.()
          },
        }
      }, [control])
      return open ? <Text testID="dialog-open">{children}</Text> : null
    },
    Handle: () => null,
    ScrollableInner: ({children}: {children?: React.ReactNode}) => (
      <>{children}</>
    ),
    Input: (props: {
      testID?: string
      value?: string
      onChangeText?: (v: string) => void
    }) => (
      <TextInput
        accessibilityLabel="Text input field"
        accessibilityHint="Test stand-in for a dialog text field"
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChangeText}
      />
    ),
  }
}
