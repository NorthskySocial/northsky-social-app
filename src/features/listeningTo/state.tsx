import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {device} from '#/storage'

export const DEFAULT_LISTENING_TO_ENABLED = true

const stateContext = createContext(DEFAULT_LISTENING_TO_ENABLED)
const setContext = createContext<(enabled: boolean) => void>(() => {})

export function Provider({children}: React.PropsWithChildren<{}>) {
  const [enabled, setEnabled] = useState(
    () => device.get(['listeningToEnabled']) ?? DEFAULT_LISTENING_TO_ENABLED,
  )

  useEffect(() => {
    const sub = device.addOnValueChangedListener(['listeningToEnabled'], () => {
      setEnabled(
        device.get(['listeningToEnabled']) ?? DEFAULT_LISTENING_TO_ENABLED,
      )
    })
    return () => sub.remove()
  }, [])

  const setEnabledWrapped = useCallback((next: boolean) => {
    setEnabled(next)
    device.set(['listeningToEnabled'], next)
  }, [])

  return (
    <stateContext.Provider value={enabled}>
      <setContext.Provider value={setEnabledWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export function useListeningToEnabled() {
  return useContext(stateContext)
}

export function useSetListeningToEnabled() {
  return useContext(setContext)
}
