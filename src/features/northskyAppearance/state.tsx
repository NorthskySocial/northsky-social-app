import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {device} from '#/storage'

/**
 * `lively` paints the brand gradient on primary buttons, the compose button
 * and control rings. `calm` uses one solid brand purple and quiet solid rings,
 * for people who find the gradient too bright.
 */
export type Accents = 'lively' | 'calm'

export const DEFAULT_ACCENTS: Accents = 'lively'

const stateContext = createContext<Accents>(DEFAULT_ACCENTS)
stateContext.displayName = 'AccentsStateContext'

const setContext = createContext<(accents: Accents) => void>(() => {})
setContext.displayName = 'AccentsSetContext'

/**
 * Reads the setting out of device storage once and shares it through context.
 * Every primary button reads it, so a per-caller `useStorage` listener would
 * open one MMKV listener per button (see `#/features/postVocabulary`).
 */
export function Provider({children}: React.PropsWithChildren<{}>) {
  const [accents, setAccents] = useState<Accents>(
    () => device.get(['accents']) ?? DEFAULT_ACCENTS,
  )

  useEffect(() => {
    const sub = device.addOnValueChangedListener(['accents'], () => {
      setAccents(device.get(['accents']) ?? DEFAULT_ACCENTS)
    })
    return () => sub.remove()
  }, [])

  const setAccentsWrapped = useCallback((next: Accents) => {
    setAccents(next)
    device.set(['accents'], next)
  }, [])

  return (
    <stateContext.Provider value={accents}>
      <setContext.Provider value={setAccentsWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export function useAccents() {
  return useContext(stateContext)
}

export function useSetAccents() {
  return useContext(setContext)
}
